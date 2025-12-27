import { PermitProvider, usePermit } from '@permit/react'
import './App.css'

function AuthDemo() {
  const { isAuthenticated, isLoading, user, login, logout } = usePermit()

  if (isLoading) {
    return <div>Carregando...</div>
  }

  return (
    <div className="auth-container">
      <h1>Permit SDK Playground</h1>

      <div className="status-card">
        <h2>Status de Autenticação</h2>
        <p>
          Status: <strong>{isAuthenticated ? 'Autenticado' : 'Não Autenticado'}</strong>
        </p>

        {isAuthenticated && user && (
          <div className="user-info">
            <h3>Informações do Usuário</h3>
            <p><strong>ID:</strong> {user.id}</p>
            <p><strong>Email:</strong> {user.email}</p>
          </div>
        )}
      </div>

      <div className="actions">
        {!isAuthenticated ? (
          <button onClick={login} className="btn-primary">
            Login com Permit
          </button>
        ) : (
          <button onClick={logout} className="btn-secondary">
            Logout
          </button>
        )}
      </div>

      <div className="info-section">
        <h3>Como Testar</h3>
        <ol>
          <li>Certifique-se que a API está rodando na porta 8080</li>
          <li>Clique em "Login com Permit" para abrir o modal</li>
          <li>Digite seu email para receber o código OTP</li>
          <li>Digite o código OTP para autenticar</li>
          <li>As informações do usuário aparecerão acima</li>
        </ol>
      </div>
    </div>
  )
}

function App() {
  return (
    <PermitProvider
      projectId="test-project-id"
      config={{
        apiUrl: 'http://localhost:8080/api/v1',
        theme: 'light'
      }}
    >
      <AuthDemo />
    </PermitProvider>
  )
}

export default App
