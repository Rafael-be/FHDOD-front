# Teste local do FHDOD

## Pré-requisitos

- Node e PostgreSQL instalados; use somente loopback (`127.0.0.1`).
- Frontend nesta branch; backend em `feature/backend-completion-analytics` com a correção local do catálogo.
- Banco **descartável** `fhdod_test`, marcador `fhdod.disposable=true`, bootstrap e todas as migrations aplicadas. Veja `FHDOD_back/docs/bootstrap.md`. Nunca reutilize uma URL Supabase para testes.

## Preparar o banco e a API

1. Em um cluster PostgreSQL local isolado, crie `fhdod_test` e aplique `FHDOD_back/src/db/bootstrap/FHDOD.sql` uma única vez.
2. Defina o marcador: `ALTER DATABASE fhdod_test SET fhdod.disposable = 'true';`.
3. No backend, execute `npm run migrate` com `DATABASE_URL_MIGRATIONS` apontando para o banco local administrativo. O ledger atual deve conter 18 migrations (0000–0017).
4. Gere duas senhas aleatórias de teste com pelo menos 12 caracteres; forneça-as somente em `DEMO_ADMIN_PASSWORD` e `DEMO_MANAGER_PASSWORD` no ambiente do processo. Execute `npm run seed:demo` com `LOCAL_DEMO_DATABASE_URL` apontando para o banco local administrativo. A fixture usa `ouvidoria@gmail.com` e `gestor@gmail.com` e é identificada como fictícia.
5. Inicie a API com `DATABASE_URL` da role local `fhdod_api`, `PORT=3317`, `ALLOWED_ORIGIN=http://localhost:5173`, `CACHE_ENABLED=false` e `SECURITY_REDIS_ENABLED=false`. Confira `http://127.0.0.1:3317/health/ready`.

As variáveis acima devem ser passadas explicitamente ao processo. O arquivo `.env` do backend pode conter URLs remotas e não deve ser usado como destino de testes.

## Iniciar o frontend

Crie `.env.local` com:

```dotenv
VITE_API_BASE_URL=
VITE_API_PROXY_TARGET=http://127.0.0.1:3317
```

Execute `npm ci` e `npm run dev`; abra o endereço local informado pelo Vite. Para os comandos de qualidade, execute typecheck, lint, teste com até 2 workers e build em sequência.

## Roteiro manual

1. Entre com `ouvidoria@gmail.com` e a senha fictícia gerada; em `/`, confira os dados de teste e o NPS da fixture.
2. Em `/setores`, abra o setor fictício; em `/setores/:id/perguntas`, crie pergunta, salve rascunho, confira a prontidão e publique. Teste também descarte, histórico e restauração. O número de revisão deve mudar após salvar.
3. Abra `/avaliacao/:id` sem login, responda à pesquisa e confira `/` novamente. Os contadores devem aumentar. Use `/manifestacao/:id` para registrar manifestação após ler a política de privacidade.
4. Em `/ouvidoria`, filtre, abra o protocolo e avance o status permitido. Em `/planilhas-turnos`, baixe modelo e versão vigente; faça upload apenas de um CSV fictício revisado, pois a planilha vigente é substituída.
5. Entre com `gestor@gmail.com`; confira que vê somente seu setor e não acessa as telas exclusivas de superusuário.
6. Para validar conflitos de rascunho, abra o editor em duas abas, salve uma revisão em cada e confirme que a segunda recebe conflito e oferece recarga.

O smoke HTTP local desta implementação verificou login de ambos os papéis, rascunho/publicação, pesquisa, analytics, Ouvidoria, upload/download CSV binário e `403` de gestor fora do escopo. O teste de interface em navegador depende de execução manual porque o ambiente da sessão não possui Chrome; os serviços de frontend têm testes leves automatizados.
