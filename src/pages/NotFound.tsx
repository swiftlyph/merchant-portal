import { Link } from "react-router-dom";

export function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-base-200 text-center">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="text-base-content/70">This page doesn&apos;t exist.</p>
      <Link to="/login" className="btn btn-primary">
        Back to login
      </Link>
    </div>
  );
}
