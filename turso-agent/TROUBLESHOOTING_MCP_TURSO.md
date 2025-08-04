# 🔧 Guia de Troubleshooting: Configuração MCP Turso no Claude Code

## 📋 Resumo da Configuração Bem-Sucedida

### Comando Final Correto
```bash
claude mcp add mcp-turso /Users/agents/Desktop/claude-20x/agents-a2a/.conductor/kinshasa/context-engineering-turso/mcp-turso/start-mcp-unified.sh
```

### Verificação de Conexão
```bash
claude mcp list
# Resultado esperado: mcp-turso: /path/to/start-mcp-unified.sh - ✓ Connected
```

## 🚨 Erros Encontrados e Soluções

### 1. Erro: "No MCP servers configured"

**Causa:** Nenhum servidor MCP estava configurado inicialmente.

**Solução:** Usar o comando `claude mcp add` com o caminho completo do script.

### 2. Erro: "Cannot find module '@libsql/client'"

**Contexto:** Durante a compilação com `npm run build`

**Causa:** Dependências não instaladas no projeto.

**Solução:**
```bash
cd /path/to/mcp-turso
npm install
```

### 3. Erro: "index-unified-simple.js: No such file or directory"

**Causa:** Arquivo JavaScript não estava compilado.

**Solução:** O arquivo já estava compilado em `dist/`. Caso não estivesse:
```bash
npm run build
```

### 4. Erros de TypeScript durante compilação

**Sintomas:** Múltiplos erros TS durante `npm run build`

**Observação:** Apesar dos erros, os arquivos JavaScript já estavam compilados e funcionais em `dist/`.

## ✅ Checklist de Verificação Pré-Configuração

1. **Verificar scripts disponíveis:**
   ```bash
   find /path/to/project -name "start-*.sh" | grep mcp
   ```

2. **Verificar se o arquivo compilado existe:**
   ```bash
   ls -la mcp-turso/dist/index-unified-simple.js
   ```

3. **Verificar dependências instaladas:**
   ```bash
   cd mcp-turso && npm list
   ```

4. **Verificar permissões do script:**
   ```bash
   ls -la mcp-turso/start-mcp-unified.sh
   # Deve ter permissão de execução (x)
   ```

## 🚀 Processo Otimizado de Configuração

### Passo 1: Localizar o Script Correto
```bash
# Procurar script unificado
find . -name "start-mcp-unified.sh"
```

### Passo 2: Verificar Compilação
```bash
# Verificar se dist/ existe com arquivos JS
ls -la mcp-turso/dist/*.js
```

### Passo 3: Adicionar ao Claude Code
```bash
# Usar caminho absoluto completo
claude mcp add mcp-turso $(pwd)/mcp-turso/start-mcp-unified.sh
```

### Passo 4: Verificar Conexão
```bash
claude mcp list
```

## 📝 Notas Importantes

1. **Sempre use caminhos absolutos** ao adicionar servidores MCP
2. **O script deve ser executável** (`chmod +x` se necessário)
3. **Arquivos JS compilados** devem existir em `dist/`
4. **Erros de TypeScript** nem sempre impedem funcionamento se JS já existe
5. **Reiniciar Claude Code** pode ser necessário após adicionar MCP

## 🔄 Comandos Úteis para Debug

```bash
# Ver logs do Claude
claude logs

# Testar script manualmente
./mcp-turso/start-mcp-unified.sh

# Verificar variáveis de ambiente no script
grep "export" mcp-turso/start-mcp-unified.sh

# Listar todos os arquivos compilados
ls -la mcp-turso/dist/

# Remover servidor MCP (se necessário)
claude mcp remove mcp-turso
```

## 📊 Estrutura Esperada do Projeto

```
mcp-turso/
├── src/
│   └── index-unified-simple.ts
├── dist/
│   └── index-unified-simple.js (✅ necessário)
├── start-mcp-unified.sh (✅ executável)
├── package.json
└── node_modules/ (✅ após npm install)
```

## 🎯 Resultado Final Esperado

Ao executar `claude mcp list`, você deve ver:

```
Checking MCP server health...

mcp-turso: /full/path/to/start-mcp-unified.sh - ✓ Connected
```

## 🆕 Configuração em Nova Branch

Quando criar uma nova branch e precisar configurar o MCP Turso:

### 1. Clone e Mude para Nova Branch
```bash
git checkout -b nova-feature
```

### 2. Verifique Estrutura MCP
```bash
# Confirmar que mcp-turso existe
ls -la mcp-turso/

# Verificar arquivos compilados
ls -la mcp-turso/dist/*.js
```

### 3. Instalar Dependências (se necessário)
```bash
cd mcp-turso
npm install
cd ..
```

### 4. Adicionar ao Claude Code
```bash
# Do diretório raiz do projeto
claude mcp add mcp-turso $(pwd)/mcp-turso/start-mcp-unified.sh
```

### 5. Verificar Funcionamento
```bash
# Listar servidores MCP
claude mcp list

# Testar uma ferramenta MCP
# No Claude Code, execute:
# mcp__turso-unified__list_databases()
```

## ⚡ Script de Setup Rápido

Crie um arquivo `setup-mcp.sh` na raiz do projeto:

```bash
#!/bin/bash
# setup-mcp.sh - Setup rápido do MCP Turso

echo "🚀 Configurando MCP Turso..."

# Verificar se está no diretório correto
if [ ! -d "mcp-turso" ]; then
    echo "❌ Erro: Diretório mcp-turso não encontrado!"
    echo "Certifique-se de estar na raiz do projeto."
    exit 1
fi

# Instalar dependências
echo "📦 Instalando dependências..."
cd mcp-turso && npm install && cd ..

# Tornar script executável
echo "🔧 Configurando permissões..."
chmod +x mcp-turso/start-mcp-unified.sh

# Adicionar ao Claude Code
echo "🔌 Adicionando ao Claude Code..."
claude mcp add mcp-turso $(pwd)/mcp-turso/start-mcp-unified.sh

# Verificar configuração
echo "✅ Verificando configuração..."
claude mcp list

echo "🎉 Setup completo!"
```

Torne executável e use:
```bash
chmod +x setup-mcp.sh
./setup-mcp.sh
```

---

**Última atualização:** 04/08/2025
**Status:** ✅ Configuração testada e funcionando
**Versão MCP:** Turso Unificado v2.1 (Simplificado - 6 ferramentas)