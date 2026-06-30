import { useClerk } from "@clerk/expo";
import { useRouter } from "expo-router";

import { Button } from "@/design-system";
import { appRoutes } from "@/navigation/routes";

export const SignOutButton = () => {
  const { signOut } = useClerk();
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace(appRoutes.auth.signIn);
    } catch (err) {
      console.error(JSON.stringify(err, null, 2));
    }
  };

  return (
    <Button variant="ghost" size="sm" onPress={() => void handleSignOut()}>
      Sign out
    </Button>
  );
};
