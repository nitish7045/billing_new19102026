import { supabase } from "../lib/supabase";

export async function getBanks(userId) {
  if (!userId) {
    throw new Error("User ID is required.");
  }

  const { data, error } = await supabase
    .from("banks")
    .select("*")
    .eq("user_id", userId)
    .order("bank_name", { ascending: true });

  if (error) {
    console.error("Error loading banks:", error);
    throw error;
  }

  return data || [];
}

export async function addBank({
  userId,
  bankName,
  accountNumber,
  ifscCode = "",
  branch = "",
}) {
  if (!userId) {
    throw new Error("User ID is required.");
  }

  if (!bankName?.trim()) {
    throw new Error("Bank name is required.");
  }

  if (!accountNumber?.trim()) {
    throw new Error("Account number is required.");
  }

  const { data, error } = await supabase
    .from("banks")
    .insert({
      user_id: userId,
      bank_name: bankName.trim(),
      account_number: accountNumber.trim(),
      ifsc_code: ifscCode.trim(),
      branch: branch.trim(),
    })
    .select()
    .single();

  if (error) {
    console.error("Error adding bank:", error);
    throw error;
  }

  return data;
}

export async function updateBank({
  userId,
  bankId,
  bankName,
  accountNumber,
  ifscCode = "",
  branch = "",
}) {
  if (!userId) {
    throw new Error("User ID is required.");
  }

  if (!bankId) {
    throw new Error("Bank ID is required.");
  }

  const { data, error } = await supabase
    .from("banks")
    .update({
      bank_name: bankName.trim(),
      account_number: accountNumber.trim(),
      ifsc_code: ifscCode.trim(),
      branch: branch.trim(),
    })
    .eq("id", bankId)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    console.error("Error updating bank:", error);
    throw error;
  }

  return data;
}

export async function deleteBank({
  userId,
  bankId,
}) {
  if (!userId) {
    throw new Error("User ID is required.");
  }

  if (!bankId) {
    throw new Error("Bank ID is required.");
  }

  const { error } = await supabase
    .from("banks")
    .delete()
    .eq("id", bankId)
    .eq("user_id", userId);

  if (error) {
    console.error("Error deleting bank:", error);
    throw error;
  }
}