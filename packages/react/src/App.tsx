import { PermitButton } from "./components/PermitButton";
import { ModeToggle } from "./components/mode-toggle";
import { usePermit } from "./hooks/usePermit";

function App() {
  const { isAuthenticated, user } = usePermit();
  return (
    <div className="max-w-3xl mx-auto p-8">
      <h1 className="text-4xl font-bold text-center mb-8">
        Permit SDK Playground
      </h1>

      <ModeToggle />

      <div className="bg-card rounded-lg p-6 mb-6 border">
        <h2 className="text-xl font-semibold mb-4">Status</h2>
        <p className="mb-4">
          {isAuthenticated ? (
            <span className="text-green-600">
              Autenticado como {user?.email}
            </span>
          ) : (
            <span className="text-muted-foreground">Não autenticado</span>
          )}
        </p>

        {isAuthenticated && user && (
          <div className="mb-4 p-4 bg-secondary rounded-md">
            <h3 className="font-medium mb-2">Informações do Usuário</h3>
            <p className="text-sm">
              <strong>ID:</strong> {user.id}
            </p>
            <p className="text-sm">
              <strong>Email:</strong> {user.email}
            </p>
          </div>
        )}

        {/* Using the new PermitButton component */}
        <PermitButton className="w-full" />
      </div>

      <div className="bg-card rounded-lg p-6 border">
        <h3 className="text-lg font-semibold mb-3">Como Testar</h3>
        <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
          <li>Certifique-se que a API está rodando na porta 8080</li>
          <li>Clique em "Login" para abrir o modal</li>
          <li>Digite seu email para receber o código OTP</li>
          <li>Digite o código OTP para autenticar</li>
          <li>As informações do usuário aparecerão acima</li>
        </ol>
      </div>
    </div>
  );
}

export default App;
