import { Link } from "@tanstack/react-router";

import { ModeToggle } from "./mode-toggle";

export default function Header() {
  return (
    <div>
      <div className="flex flex-row items-center justify-between px-4 py-2">
        <Link to="/" className="text-lg font-semibold">
          Kabeer OS
        </Link>
        <div className="flex items-center gap-4">
          <Link to="/dashboard">Dashboard</Link>
          <ModeToggle />
        </div>
      </div>
      <hr />
    </div>
  );
}
