# Ativação da Área do Aluno — Vitality Gym

A interface foi adicionada ao GitHub, mas **o login ainda não funciona** até configurar o backend. Não armazene senhas ou dados de alunos em arquivos públicos.

1. Crie um projeto Supabase **novo e exclusivo da Vitality**.
2. No SQL Editor, execute `supabase/schema.sql`.
3. Em Authentication, desative inscrições públicas por e-mail (signups). Configure URL do site e URLs de redirecionamento de convite. Convites são enviados pela função protegida.
4. No painel Supabase Auth, crie manualmente o primeiro usuário administrador com e-mail próprio e senha segura. Copie seu UUID. No SQL Editor, execute a instrução de promoção ao administrador presente no fim de `schema.sql` substituindo o UUID.
5. Publique a Edge Function `create-student` com verificação de JWT ativada. Não desative a verificação de JWT. A função verifica também o perfil administrador no banco.
6. Em `supabase-config.js`, informe somente a Project URL e a chave pública anon/publishable do Supabase. **Nunca publique service_role nem segredos**.
7. Configure envio de e-mails SMTP confiável para convites. Teste convite, criação de senha, login, edição da ficha, aprovação e desativação de usuário.
8. Revise as políticas RLS e faça testes com duas contas de aluno diferentes: cada aluno só pode ver e editar sua própria ficha. Administradores podem revisar e aprovar.
9. Antes de produção, obtenha revisão de segurança, conformidade LGPD, política de retenção/exclusão, autorização para tratamento de dados pessoais e avaliação profissional dos treinos.

O cadastro de aluno é exclusivo do administrador; alunos recebem convite e definem senha. Alterações do aluno mudam o status para `pending_review`, e o administrador pode aprovar. A desativação bloqueia acesso aos dados pela aplicação/RLS, mas não apaga o usuário do Auth.

**Observação:** este repositório é um site estático com JavaScript e Supabase externo. O backend não foi implantado automaticamente. O login mostra uma mensagem de configuração pendente até as chaves públicas serem configuradas.
