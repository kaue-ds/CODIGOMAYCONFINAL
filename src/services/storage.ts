
import { createClient, User as SupabaseUser } from '@supabase/supabase-js';
import { User, SavedInspection, SystemLog, InspectionData, UserRole } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase URL and anon key are required.");
}

// Initialize Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- AUTHENTICATION ---

/**
 * Logs in a user using Supabase Auth.
 * Note: Assumes the 'username' is the email for authentication.
 */
export const loginUser = async (username: string, password_provided: string): Promise<User | null> => {
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: username,
    password: password_provided,
  });

  if (authError || !authData.user) {
    console.error("Login failed:", authError?.message);
    return null;
  }

  // After successful login, fetch the user's profile from the public 'users' table
  const { data: profileData, error: profileError } = await supabase
    .from('users')
    .select('*')
    .eq('id', authData.user.id)
    .single();

  if (profileError || !profileData) {
    console.error("Could not fetch user profile after login:", profileError?.message);
    // Even if the profile is missing, the user is logged in. Log them out.
    await supabase.auth.signOut();
    return null;
  }

  // Return the combined auth and profile data
  return profileData;
};

/**
 * Creates a new user in Supabase Auth and a corresponding public profile.
 */
export const createUser = async (currentUser: User, newUser: { username: string, password_provided: string, name: string, role: UserRole, maxEmployees?: number }): Promise<{ success: boolean, message?: string }> => {
  if (currentUser.role !== 'super_admin' && currentUser.role !== 'admin') {
    return { success: false, message: "You don't have permission to create users." };
  }

  // Use a temporary admin client with the service_role key to bypass RLS for user creation.
  // IMPORTANT: This is a simplified approach. In a real-world app, this should be an Edge Function.
  // Since we cannot get the service key securely here, we will proceed, but this might fail if RLS is restrictive.

  const { data, error } = await supabase.auth.signUp({
    email: newUser.username,
    password: newUser.password_provided,
    options: {
      data: {
        name: newUser.name,
        role: newUser.role,
        created_by: currentUser.id,
        max_employees: newUser.maxEmployees,
        is_active: true,
      }
    }
  });

  if (error || !data.user) {
    console.error("Error creating auth user:", error?.message);
    return { success: false, message: error?.message || "Could not create user." };
  }

  // The user profile is created via a trigger in Supabase from the auth data.
  // If not, we would need to insert it manually here.
  await logAction(currentUser, 'CREATE_USER', `Created user ${newUser.username}`);
  return { success: true };
};

/**
 * Deletes a user's public profile.
 * IMPORTANT: This does NOT delete the user from Supabase Auth for security reasons.
 * A server-side Edge Function is required for full, secure user deletion.
 */
export const deleteUser = async (currentUser: User, userIdToDelete: string): Promise<boolean> => {
  console.warn(`DELETING USER DATA FOR ID: ${userIdToDelete}. THIS DOES NOT DELETE THE AUTH USER.`);

  const { data: userToDelete, error: fetchError } = await supabase
    .from('users')
    .select('username, role, createdBy')
    .eq('id', userIdToDelete)
    .single();

  if (fetchError || !userToDelete) {
      console.error("Could not find user profile to delete.", fetchError);
      return false;
  }

  if (currentUser.role === 'admin' && userToDelete.createdBy !== currentUser.id) {
    console.warn("Permission Denied: Admin tried to delete a user they didn't create.");
    return false;
  }

  // If the user is an admin, delete their employees' profiles first.
  if (userToDelete.role === 'admin' || userToDelete.role === 'super_admin') {
      const { error: employeeDeleteError } = await supabase
          .from('users')
          .delete()
          .eq('createdBy', userIdToDelete);
      if (employeeDeleteError) {
          console.error("Error deleting employees of admin:", employeeDeleteError);
          // Continue anyway to delete the admin profile
      }
  }

  const { error } = await supabase.from('users').delete().eq('id', userIdToDelete);

  if (error) {
    console.error("Error deleting user profile:", error.message);
    return false;
  }

  await logAction(currentUser, 'DELETE_USER_DATA', `Deleted user profile for ${userToDelete.username}. Auth user still exists.`);
  alert("Perfil do usuário e dados associados excluídos. O login do usuário permanecerá ativo até ser removido por um Super Admin no painel do Supabase.");
  return true;
};

/**
 * Logs out the current user.
 */
export const logoutUser = async () => {
  await supabase.auth.signOut();
};

/**
 * Gets the current user session from Supabase.
 */
export const getCurrentUser = async (): Promise<User | null> => {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session) {
    return null;
  }

  // Fetch profile
  const { data: profileData, error: profileError } = await supabase
    .from('users')
    .select('*')
    .eq('id', session.user.id)
    .single();

  return profileError ? null : profileData;
};

/**
 * Updates the user's password securely.
 */
export const changePassword = async (newPassword_provided: string): Promise<{ success: boolean, message: string }> => {
    const { error } = await supabase.auth.updateUser({ password: newPassword_provided });

    if (error) {
        console.error("Error changing password:", error);
        return { success: false, message: "Erro ao alterar a senha." };
    }

    // We cannot get user here, so logging is tricky.
    // await logAction(user, 'CHANGE_PASSWORD', 'O usuário alterou sua própria senha.');
    return { success: true, message: "Senha alterada com sucesso!" };
};


// --- NON-AUTH FUNCTIONS ---

const logAction = async (user: User, action: string, details: string) => {
  try {
    await supabase.from('logs').insert({ username: user.username, action, details });
  } catch (error) { console.error("Error logging action:", error); }
};

export const getInspections = async (): Promise<SavedInspection[]> => {
  const { data, error } = await supabase.from('inspections').select('*');
  return error ? [] : data || [];
};

export const getUsers = async (): Promise<User[]> => {
  const { data, error } = await supabase.from('users').select('*');
  return error ? [] : data || [];
};

export const getLogs = async (): Promise<SystemLog[]> => {
  const { data, error } = await supabase.from('logs').select('*').order('timestamp', { ascending: false });
  return error ? [] : data || [];
};

export const deleteAllUsersComplete = async (currentUser: User): Promise<boolean> => {
    if (currentUser.role !== 'super_admin') return false;
    // This is also a server-side task. We just delete the profiles.
    console.warn("DELETING ALL USER PROFILES. THIS DOES NOT DELETE AUTH USERS.");
    const { error } = await supabase.from('users').delete().neq('role', 'super_admin');
    if (error) return false;
    await logAction(currentUser, 'RESET_SYSTEM_DATA', 'Deleted all non-super-admin user profiles.');
    return true;
};

export const deleteInspection = async (currentUser: User, inspectionId: string): Promise<boolean> => {
  const { error } = await supabase.from('inspections').delete().eq('id', inspectionId);
  if (error) return false;
  await logAction(currentUser, 'DELETE_INSPECTION', `Deleted inspection ID: ${inspectionId}`);
  return true;
};

export const updateUserStatus = async (currentUser: User, userIdToUpdate: string, newStatus: boolean): Promise<boolean> => {
    const { error } = await supabase.from('users').update({ isActive: newStatus }).eq('id', userIdToUpdate);
    if (error) return false;
    await logAction(currentUser, 'UPDATE_USER_STATUS', `Set status for user ID ${userIdToUpdate} to ${newStatus ? 'ACTIVE' : 'INACTIVE'}`);
    return true;
};

export const updateUserQuota = async (currentUser: User, userIdToUpdate: string, newQuota: number): Promise<boolean> => {
    if (currentUser.role !== 'super_admin') return false;
    const { error } = await supabase.from('users').update({ maxEmployees: newQuota }).eq('id', userIdToUpdate);
    if (error) return false;
    await logAction(currentUser, 'UPDATE_USER_QUOTA', `Set employee quota for user ID ${userIdToUpdate} to ${newQuota}`);
    return true;
};

export const saveInspection = async (data: InspectionData, user: User): Promise<void> => {
    const inspectionRecord = { ...data, savedBy: user.username, id: data.id || crypto.randomUUID(), date: new Date().toISOString() };
    const { error } = await (data.id
        ? supabase.from('inspections').update(inspectionRecord).eq('id', data.id)
        : supabase.from('inspections').insert(inspectionRecord));
    if (error) throw new Error(error.message);
    await logAction(user, data.id ? 'UPDATE_INSPECTION' : 'CREATE_INSPECTION', `Inspection for plate ${data.plate}`);
};
