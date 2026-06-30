import * as SecureStore from "expo-secure-store";

function getOnboardingKey(userId: string) {
  return `onboarding-complete.${userId}`;
}

export async function getOnboardingComplete(userId: string) {
  return (await SecureStore.getItemAsync(getOnboardingKey(userId))) === "true";
}

export async function setOnboardingComplete(userId: string) {
  await SecureStore.setItemAsync(getOnboardingKey(userId), "true");
}
