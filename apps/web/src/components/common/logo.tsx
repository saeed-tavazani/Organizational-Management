import { Link } from "@tanstack/react-router";
import useProjectStore from "@/store/project";

type LogoProps = {
  className?: string;
};

export function Logo({ className = "" }: LogoProps) {
  const { setProject } = useProjectStore();

  return (
    <Link
      onClick={() => {
        setProject(undefined);
      }}
      to="/dashboard"
      className={`w-auto ${className}`}
    >
      <img
        src="/brand-light.png"
        alt="Montask"
        className="h-6 w-auto dark:hidden"
      />
      <img
        src="/brand-dark.png"
        alt="Montask"
        className="hidden h-6 w-auto dark:block"
      />
    </Link>
  );
}
