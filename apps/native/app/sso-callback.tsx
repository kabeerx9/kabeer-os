import { ActivityIndicator, View } from "react-native";

// OAuth redirect lands here; useSSO handles the token exchange before this renders.
export default function SSOCallback() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator />
    </View>
  );
}
