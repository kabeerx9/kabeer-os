import { useAuth } from "@clerk/react";
import { Link } from "@tanstack/react-router";

import { ModeToggle } from "./mode-toggle";

export default function Header() {
  const { isSignedIn } = useAuth();

  return (
    <div>
      <div className="flex flex-row items-center justify-between px-4 py-2">
        <Link to="/" className="text-lg font-semibold">
          App Starter
        </Link>
        <div className="flex items-center gap-4">
          {isSignedIn ? (
            <>
              <Link to="/dashboard">Dashboard</Link>
              <Link to="/account">Account</Link>
            </>
          ) : (
            <Link to="/sign-up">Sign up</Link>
          )}
          <ModeToggle />
        </div>
      </div>
      <hr />
    </div>
  );
}
