# Feature Specification: Developer Dashboard

**Feature Branch**: `003-developer-dashboard`
**Created**: 2026-01-24
**Status**: Draft
**Input**: User description: "Dashboard para clientes (desenvolvedores SaaS) gerenciarem projetos, usuários e API keys usando o próprio sistema de auth (dogfooding)"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Dashboard Login via Próprio Sistema (Priority: P1)

O desenvolvedor acessa o dashboard do Permit através do próprio sistema de autenticação que oferecemos (dogfooding). Ao entrar, ele vê uma tela de login simples que utiliza o fluxo OTP já implementado.

**Why this priority**: Este é o ponto de entrada para todas as outras funcionalidades. Sem autenticação, nenhuma outra feature é acessível. Também valida o próprio produto (dogfooding).

**Independent Test**: Pode ser testado acessando a URL do dashboard, inserindo email, recebendo OTP, e verificando acesso à área logada.

**Acceptance Scenarios**:

1. **Given** desenvolvedor não autenticado, **When** acessa o dashboard, **Then** vê tela de login com campo de email
2. **Given** desenvolvedor na tela de login, **When** insere email válido, **Then** recebe OTP por email e vê campo para inserir código
3. **Given** desenvolvedor com OTP válido, **When** insere código correto, **Then** é autenticado e redirecionado ao dashboard principal
4. **Given** desenvolvedor autenticado, **When** acessa o dashboard novamente, **Then** sua sessão é mantida e acessa diretamente o conteúdo

---

### User Story 2 - Visualização de Projetos (Priority: P1)

O desenvolvedor autenticado pode ver uma lista de todos os seus projetos na página principal do dashboard. Cada projeto mostra informações básicas como nome, data de criação, e quantidade de usuários.

**Why this priority**: Projetos são a entidade principal do sistema. O desenvolvedor precisa ver seus projetos para então gerenciar usuários e API keys.

**Independent Test**: Após login, verificar que a lista de projetos é exibida com informações corretas.

**Acceptance Scenarios**:

1. **Given** desenvolvedor autenticado com projetos, **When** acessa o dashboard, **Then** vê lista de todos os seus projetos
2. **Given** desenvolvedor autenticado sem projetos, **When** acessa o dashboard, **Then** vê mensagem indicando que não há projetos e sugestão para criar
3. **Given** desenvolvedor na lista de projetos, **When** clica em um projeto, **Then** é direcionado aos detalhes do projeto

---

### User Story 3 - Visualização de Usuários do Projeto (Priority: P2)

O desenvolvedor pode visualizar todos os usuários de um projeto específico, incluindo informações como email, método de autenticação utilizado (OTP, OAuth, etc.), data de cadastro e último acesso.

**Why this priority**: Após ver projetos, o próximo passo natural é entender quem são os usuários de cada projeto e como estão se autenticando.

**Independent Test**: Acessar detalhes de um projeto e verificar que a lista de usuários é exibida com informações corretas.

**Acceptance Scenarios**:

1. **Given** desenvolvedor na página de detalhes do projeto, **When** acessa a seção de usuários, **Then** vê tabela com lista de usuários e suas informações
2. **Given** projeto com usuários, **When** visualiza a lista, **Then** vê email, método de login, data de cadastro e último acesso de cada usuário
3. **Given** projeto sem usuários, **When** acessa seção de usuários, **Then** vê mensagem indicando que ainda não há usuários registrados
4. **Given** lista de usuários grande, **When** navega pela lista, **Then** pode paginar ou buscar usuários específicos

---

### User Story 4 - Gerenciamento de API Keys (Priority: P2)

O desenvolvedor pode visualizar as API keys existentes do projeto e criar novas keys. Ao criar uma nova key, ela é exibida uma única vez para cópia segura.

**Why this priority**: API keys são essenciais para os desenvolvedores integrarem o Permit em suas aplicações. É uma funcionalidade core após o setup inicial.

**Independent Test**: Acessar seção de API keys, criar nova key, verificar que é exibida uma vez e pode ser copiada.

**Acceptance Scenarios**:

1. **Given** desenvolvedor na página do projeto, **When** acessa seção de API Keys, **Then** vê lista de keys existentes (parcialmente mascaradas)
2. **Given** desenvolvedor na seção API Keys, **When** clica em criar nova key, **Then** pode definir um nome/descrição para a key
3. **Given** nova key criada, **When** a key é gerada, **Then** é exibida uma única vez com opção de copiar e aviso de que não será mostrada novamente
4. **Given** lista de API keys, **When** clica em revogar uma key, **Then** recebe confirmação e a key é desativada permanentemente

---

### User Story 5 - Navegação e UX do Dashboard (Priority: P3)

O dashboard oferece navegação clara e intuitiva entre as diferentes seções (projetos, usuários, API keys, configurações), com feedback visual para ações e estados de loading.

**Why this priority**: Uma boa UX aumenta a satisfação do usuário e reduz fricção, mas as funcionalidades core devem ser implementadas primeiro.

**Independent Test**: Navegar entre diferentes seções verificando que a UI responde corretamente e feedback visual é apropriado.

**Acceptance Scenarios**:

1. **Given** desenvolvedor em qualquer página, **When** navega para outra seção, **Then** a transição é suave e o estado de loading é indicado
2. **Given** ação em progresso (criar key, carregar usuários), **When** aguarda resultado, **Then** vê indicador de loading apropriado
3. **Given** erro em alguma operação, **When** operação falha, **Then** vê mensagem de erro clara e opção para tentar novamente
4. **Given** desenvolvedor no dashboard, **When** procura por funcionalidade, **Then** encontra facilmente através do menu de navegação lateral ou header

---

### User Story 6 - Renovação Automática de Sessão com Refresh Token (Priority: P1)

O sistema mantém a sessão do usuário ativa utilizando refresh tokens. Quando o JWT expira, o sistema automaticamente usa o refresh token para obter um novo JWT válido, sem interromper a experiência do usuário. Apenas quando o refresh token expira (após 7 dias de inatividade) o usuário precisa fazer login novamente.

**Why this priority**: Esta é uma melhoria crítica de UX que evita frustração do usuário ao ser deslogado durante uso ativo. Também beneficia os clientes que usam o SDK, pois o mesmo comportamento será aplicado.

**Independent Test**: Simular expiração do JWT durante uso ativo e verificar que o refresh token é usado automaticamente para obter novo JWT.

**Acceptance Scenarios**:

1. **Given** usuário com JWT válido, **When** JWT expira durante uso, **Then** sistema automaticamente usa refresh token para obter novo JWT sem interrupção
2. **Given** usuário com refresh token válido, **When** faz requisição com JWT expirado, **Then** recebe novo JWT e requisição é processada normalmente
3. **Given** usuário com refresh token expirado (>7 dias), **When** tenta acessar recurso protegido, **Then** é redirecionado para tela de login
4. **Given** usuário no SDK do cliente, **When** JWT expira, **Then** SDK usa refresh token automaticamente (mesmo comportamento do dashboard)

---

### Edge Cases

- O que acontece quando o JWT expira durante uso? → Sistema usa refresh token automaticamente para obter novo JWT sem interromper o usuário
- O que acontece quando o refresh token expira? → Usuário é redirecionado para login mantendo URL original para retornar após autenticar (após 7 dias de inatividade)
- Como o sistema lida com múltiplas abas abertas? → Sessão e tokens são compartilhados via storage, refresh em uma aba atualiza todas
- O que acontece se tentar criar API key sem permissão? → Exibe mensagem de erro explicando falta de permissão
- Como lidar com projetos que têm milhares de usuários? → Paginação com limite de 50 usuários por página e busca
- O que acontece se o refresh token for inválido/revogado? → Usuário é deslogado e redirecionado para login com mensagem apropriada

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Sistema DEVE autenticar desenvolvedores usando o fluxo OTP próprio (dogfooding)
- **FR-002**: Sistema DEVE exibir lista de projetos do desenvolvedor autenticado
- **FR-003**: Sistema DEVE exibir informações básicas de cada projeto (nome, data criação, contagem de usuários)
- **FR-004**: Sistema DEVE exibir lista de usuários de um projeto específico
- **FR-005**: Sistema DEVE mostrar método de autenticação utilizado por cada usuário (OTP, OAuth, etc.)
- **FR-006**: Sistema DEVE permitir visualização de API keys existentes (parcialmente mascaradas)
- **FR-007**: Sistema DEVE permitir criação de novas API keys com nome/descrição
- **FR-008**: Sistema DEVE exibir API key completa apenas uma vez no momento da criação
- **FR-009**: Sistema DEVE permitir revogação de API keys existentes
- **FR-010**: Sistema DEVE manter sessão do desenvolvedor entre acessos usando refresh tokens
- **FR-011**: Sistema DEVE renovar JWT automaticamente usando refresh token quando JWT expirar
- **FR-012**: Sistema DEVE redirecionar para login apenas quando refresh token expirar (7 dias de inatividade)
- **FR-013**: Sistema DEVE fornecer navegação clara entre seções (projetos, usuários, API keys)
- **FR-014**: Sistema DEVE exibir feedback visual para operações em progresso e erros
- **FR-015**: SDK DEVE implementar mesmo comportamento de refresh token do dashboard (consistência)

### Key Entities

- **Developer**: Usuário do dashboard (cliente do Permit). Possui email, projetos associados, sessão de autenticação.
- **Project**: Projeto do desenvolvedor que usa Permit para auth. Possui nome, data de criação, configurações, usuários e API keys.
- **Project User**: Usuário final do projeto do desenvolvedor. Possui email, método de autenticação, datas de registro e último acesso.
- **API Key**: Credencial para integração. Possui nome/descrição, token (mascarado após criação), status (ativa/revogada), data de criação.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Desenvolvedores conseguem fazer login no dashboard em menos de 60 segundos
- **SC-002**: Lista de projetos carrega em menos de 2 segundos
- **SC-003**: Lista de usuários com até 1000 registros carrega em menos de 3 segundos
- **SC-004**: 90% dos desenvolvedores conseguem criar uma API key na primeira tentativa
- **SC-005**: Dashboard suporta 100 desenvolvedores logados simultaneamente sem degradação perceptível
- **SC-006**: Taxa de erro em operações do dashboard é menor que 1%
- **SC-007**: Navegação entre seções do dashboard ocorre em menos de 1 segundo

## Assumptions

- O sistema de autenticação OTP já está implementado e funcionando (feature 001-embedded-auth)
- A estrutura de dados de projetos, usuários e API keys já existe no backend
- O desenvolvedor só tem acesso aos seus próprios projetos (multi-tenancy já implementado)
- API keys são strings seguras geradas pelo backend
- O frontend será desenvolvido em React com TailwindCSS (consistente com o padrão do projeto)
