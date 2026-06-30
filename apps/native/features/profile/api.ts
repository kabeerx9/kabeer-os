import {
  deleteAccount,
  updateAccount,
  type DeleteAccountInput,
  type UpdateAccountInput,
} from "@/lib/api";

export const profileApi = {
  updateAccount: (input: UpdateAccountInput) => updateAccount(input),
  deleteAccount: (input: DeleteAccountInput) => deleteAccount(input),
};
