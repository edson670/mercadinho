-- Executado automaticamente pelo Postgres apenas na PRIMEIRA inicialização
-- do volume (docker-entrypoint-initdb.d). Cria o banco dedicado da
-- Evolution API — mantê-lo separado do banco "mercado" evita qualquer
-- interferência entre os dois sistemas.
CREATE DATABASE evolution;
