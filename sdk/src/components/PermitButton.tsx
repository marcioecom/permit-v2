import { Button, type ButtonProps } from "@/components/ui/button";
import { usePermit } from "@/hooks/usePermit";
import { LogIn, LogOut } from "lucide-react";

interface PermitButtonProps extends Omit<ButtonProps, "onClick"> {
  loginText?: string;
  logoutText?: string;
  showIcon?: boolean;
}

export const PermitButton = ({
  loginText = "Login",
  logoutText = "Logout",
  showIcon = true,
  ...props
}: PermitButtonProps) => {
  const { isAuthenticated, login, logout } = usePermit();

  if (isAuthenticated) {
    return (
      <Button onClick={logout} variant="outline" {...props}>
        {showIcon && <LogOut className="mr-2 h-4 w-4" />}
        {logoutText}
      </Button>
    );
  }

  return (
    <Button onClick={login} {...props}>
      {showIcon && <LogIn className="mr-2 h-4 w-4" />}
      {loginText}
    </Button>
  );
};
