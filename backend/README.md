# Backend SmartPet — BACK-01, BACK-02 e BACK-03

Servidor Node.js com SQLite persistente, autenticação real de funcionários e gestão de tutores. Node.js **22.20.0 ou superior**; validado com 22.20.0. Nenhuma dependência nova foi instalada. O aviso experimental de `node:sqlite` nessa versão não impede a execução.

## Primeiro acesso

1. Copie `backend/.env.example` para `backend/.env` (ignorado pelo Git).
2. Preencha `BOOTSTRAP_NAME`, `BOOTSTRAP_EMAIL` e `BOOTSTRAP_PASSWORD` com os dados do primeiro gerente. Use uma senha exclusiva entre **15 e 128 caracteres**, preferencialmente uma frase longa. Coloque valores entre aspas no arquivo se contiverem espaços ou `#`. Não envie a senha pelo chat nem a inclua em arquivos versionados.
3. Na raiz do projeto, execute:

```sh
npm run auth:bootstrap
```

4. Após a confirmação, remova `BOOTSTRAP_PASSWORD` do arquivo/ambiente. O banco guarda somente o hash, nunca a senha original.
5. Inicie o backend e o frontend em **dois terminais**:

```sh
npm run server
```

```sh
npm run dev
```

Acesse o endereço exibido pelo frontend e use a conta criada. **As antigas contas de demonstração não funcionam mais.** Não há senha padrão, cadastro público de funcionários ou acesso de tutores.

O comando de implantação só funciona quando não existe nenhum funcionário. Ele nunca substitui contas ou senhas existentes, e verifica novamente a condição dentro de uma transação. Não é executado automaticamente ao iniciar o servidor. A tela de administração de funcionários, a criação de outras contas (incluindo atendentes) e a recuperação de senha permanecem para o cartão correspondente; o backend já reconhece ambos os perfis.

Se o npm instalado na máquina apresentar erro, os equivalentes são:

```sh
node backend/src/bootstrap.mjs
node backend/src/server.mjs
node node_modules/vite/bin/vite.js --configLoader runner
```

Os dois últimos comandos devem ser executados em terminais separados.

## O que já está conectado

- **Login:** consulta funcionários reais, verifica a senha, cria sessão, restaura o acesso ao recarregar e encerra a sessão no logout.
- **Tutores:** cadastro, listagem paginada, pesquisa por nome/telefone/email, consulta individual com pets vinculados, edição e inativação.
- **Outras telas:** continuam com dados locais de demonstração, identificados na interface. Não há importação automática desses dados para o banco. O dashboard ainda não representa os totais reais de tutores.
- Os tutores reais da nova tela não são misturados aos tutores/pets de demonstração. O cadastro e a transferência de pets reais pertencem ao BACK-04. Links do protótipo para IDs de tutores demonstrativos podem retornar “Tutor não encontrado” no banco real.

## Permissões aplicadas no servidor

| Operação | Gerente | Atendente |
| --- | --- | --- |
| Consultar a própria sessão e sair | Sim | Sim |
| Listar/pesquisar/consultar tutores, inclusive inativos | Sim | Sim |
| Cadastrar e editar tutores ativos | Sim | Sim |
| Inativar tutores | Sim | Não |
| Excluir definitivamente tutores | Não existe | Não existe |

A inativação foi reservada ao gerente como regra desta implementação. O servidor verifica a sessão e o perfil; esconder botões não é a proteção de acesso. Uma alteração no perfil, senha ou situação do funcionário revoga suas sessões.

Inativar não remove o tutor nem seus pets/agendamentos. O cadastro inativo permanece consultável, mas não editável; o email continua reservado. Não existe endpoint de reativação nesta etapa.

## API e contratos

Todas as respostas são JSON: sucesso em `{ "data": ... }`; erro em:

```json
{
  "error": {
    "code": "INVALID_EMAIL",
    "message": "Informe um email válido.",
    "requestId": "identificador-da-requisicao"
  }
}
```

O mesmo identificador é enviado no cabeçalho `X-Request-Id`. Erros inesperados não expõem SQL, hash, senha, token, caminho do banco ou stack trace.

| Método e rota | Comportamento |
| --- | --- |
| GET /api/health | Servidor respondendo |
| GET /api/ready | Conexão com o banco; 503 se indisponível |
| POST /api/auth/login | Recebe email/senha, envia cookie e retorna usuário público e expiresAt |
| GET /api/auth/me | Usuário e vencimento da sessão; 401 se ausente/expirada |
| POST /api/auth/logout | Revoga o token no banco e expira o cookie; pode ser repetido |
| GET /api/tutors | Lista paginada; exige sessão |
| POST /api/tutors | Cria tutor; responde 201 |
| GET /api/tutors/:id | Tutor, quantidade e lista dos pets vinculados no banco |
| PUT /api/tutors/:id | Substitui os campos editáveis; exige tutor ativo |
| POST /api/tutors/:id/deactivate | Inativação, somente gerente |

As rotas GET também aceitam HEAD. Não há DELETE. Métodos não permitidos respondem 405, sem sessão 401, sem permissão 403, cadastro ausente 404, email duplicado/tutor inativo 409, dados inválidos 400, corpo excessivo 413, tipo de conteúdo incorreto 415 e excesso de tentativas 429.

### Cadastro e edição de tutor

```json
{
  "name": "Nome do cliente",
  "phone": "(85) 99999-0000",
  "email": "cliente@example.com",
  "address": "Endereço opcional",
  "notes": "Observações opcionais"
}
```

Nome: 2–100 caracteres; telefone: 10 ou 11 dígitos após retirar formatação; email opcional, válido e único sem diferenciar maiúsculas/minúsculas; endereço até 500 caracteres; observações até 2000. Campos desconhecidos são rejeitados — não é possível alterar ID ou situação pelo corpo do cadastro. Email ausente é armazenado como NULL.

A listagem aceita `q`, `status=active|inactive|all`, `page` (a partir de 1) e `limit` (1–100, padrão 30). Exemplo: `/api/tutors?q=Ana&status=all&page=1&limit=30`. Retorna `items`, `total`, `page` e `limit`. Curingas SQL informados na busca são tratados como texto, não como comandos.

## Autenticação e proteção

- Senhas com **scrypt**, salt aleatório de 16 bytes, N=131072, r=8, p=1 e comparação de tamanho fixo com `timingSafeEqual`. Parâmetros baseados na [orientação OWASP para scrypt](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html#scrypt).
- Token aleatório de 32 bytes em cookie **HttpOnly**, **SameSite=Strict**, Path=/ e validade fixa de **8 horas** (não renovada por atividade). O banco guarda só SHA-256 do token. Senha e token não ficam no localStorage/sessionStorage nem no JSON de resposta.
- Novo login revoga o token anterior recebido no cookie. Logout revoga a sessão no banco. Reiniciar o servidor não remove sessões válidas do banco persistente.
- Tentativas limitadas em memória por email (10) e IP (30) numa janela de 15 minutos; no máximo duas verificações de senha simultâneas por processo. O limite considera também logins bem-sucedidos na janela. Não se confia em X-Forwarded-For fornecido pelo cliente.
- Escritas exigem `X-SmartPet-Request: 1`; se houver `Origin`, ele precisa estar na lista autorizada. Requisições identificadas como cross-site são bloqueadas. O navegador não tem permissão CORS para origens externas. Login também recebe essa proteção.
- Cadastro/edição exigem `Content-Type: application/json`; limite de 16 KiB. Consultas SQL usam parâmetros.

## Configuração e implantação

Valores padrão: HOST=127.0.0.1, PORT=3001, DATABASE_PATH=./data/smartpet.sqlite (relativo à pasta backend). O banco e os arquivos auxiliares são ignorados pelo Git. Variáveis já definidas no ambiente têm prioridade sobre o arquivo .env.

No desenvolvimento, o Vite encaminha `/api` ao backend na porta 3001. Frontend e API aparecem para o navegador na mesma origem. As origens locais 5173 (dev), 4173 (preview) e 3001, em localhost/127.0.0.1, são aceitas. A configuração usa porta estrita para evitar mudar silenciosamente para uma origem não autorizada. Se mudar as portas, ajuste o proxy e APP_ORIGINS.

Em produção:

- Defina `NODE_ENV=production` e `APP_ORIGINS=https://seu-dominio` (separadas por vírgula se houver mais de uma origem).
- Sirva os arquivos do frontend e encaminhe `/api` sob o **mesmo domínio HTTPS** por um proxy reverso. A API Node não serve a pasta dist.
- Cookies Secure com prefixo `__Host-` são obrigatórios em produção. COOKIE_SECURE=false não desativa essa proteção.
- Mantenha o banco fora da pasta pública, com permissões restritas do sistema operacional e backups. SQLite nesta configuração não inclui criptografia em repouso.
- Esta base ainda exige avaliação operacional antes de receber dados reais. O limitador é por processo e reinicia com o servidor; múltiplas instâncias/proxy exigem um limitador compartilhado e uma política explícita de IP confiável. HTTPS, backups automatizados, recuperação de conta, monitoramento e auditoria completa não foram implantados.

## Banco e migrações

A migração `001_initial.sql` foi preservada. `002_sessions.sql` acrescenta sessões e sua revogação automática. Tabelas de negócio:

- employees: funcionários, hash, perfil e situação.
- tutors: dados dos clientes, situação e datas.
- pets: tutor atual obrigatório.
- services: preço em centavos, duração em minutos.
- appointments: pet, serviço, tutor na reserva e funcionário criador; preço/duração históricos.
- sessions e schema_migrations: controle técnico.

Chaves estrangeiras são habilitadas por conexão. Exclusões de entidades referenciadas são bloqueadas; sessões são removidas se seu funcionário for excluído. Mudanças no tutor atual do pet ou no serviço não reescrevem o histórico dos agendamentos.

Valores monetários são inteiros em centavos; durações em minutos. Data/hora da agenda representam o horário local do estabelecimento (America/Fortaleza); created_at/updated_at usam UTC. O banco bloqueia duplicidade de reserva ativa para o mesmo pet no mesmo início, mas regras de sobreposição, capacidade, entidades ativas e transição de estados pertencem ao cartão da agenda.

```sh
npm run db:migrate
```

O servidor também aplica migrações pendentes antes de abrir a porta. Migrações são transacionais, repetíveis sem duplicação e verificadas por checksum. Não altere/remova versões aplicadas; adicione um novo arquivo sequencial. Não há reset automático. Antes de mudanças em dados reais, faça backup com o servidor parado, incluindo arquivos auxiliares -wal/-shm quando existentes.

## Verificação

```sh
npm test
npm run test:backend
npm run build
```

Sem npm: `node --experimental-strip-types --test tests/data.test.ts backend/tests/*.test.mjs` e `node node_modules/vite/bin/vite.js build --configLoader runner`.

Os testes usam bancos em memória/temporários e não alteram cadastros reais. Cobrem hash, implantação inicial, cookies, expiração, logout, revogação, perfis, proteção de origem, limite de tentativas, validações, consultas, inativação, vínculos, persistência e migrações.

## Próximas etapas

BACK-04: pets reais e histórico de transferências. Depois: serviços, agenda, indicadores/relatórios reais e administração de funcionários/auditoria. Recuperação de senha e reativação de cadastros não são funcionalidades entregues nesta etapa.

