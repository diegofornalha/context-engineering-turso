# 🔄 Guia de Migração: Graphiti-Turso MCP

## 📋 Como Migrar da Versão Básica para a Completa

### Passo 1: Escolher a Versão

| Versão | Arquivo | Quando Usar |
|--------|---------|-------------|
| **FastMCP** | `graphiti_mcp_fastmcp.py` | Testes e desenvolvimento |
| **Complete** | `graphiti_mcp_complete.py` | Produção local |
| **Integrated** | `graphiti_mcp_turso_integrated.py` | Produção com cloud |

### Passo 2: Atualizar o Script de Inicialização

#### Para usar a versão Complete (recomendada):
```bash
# Editar start_mcp.sh
nano start_mcp.sh

# Mudar a última linha para:
exec python3 graphiti_mcp_complete.py
```

#### Para usar a versão Integrated (com Turso):
```bash
# Usar o script dedicado
./start_mcp_complete.sh
```

### Passo 3: Instalar Dependências (se necessário)

```bash
# Ativar ambiente virtual
source .venv/bin/activate

# Para versão Integrated (com webhooks)
.venv/bin/python3 -m pip install aiohttp
```

### Passo 4: Migrar Dados Existentes

Se você tem dados na versão básica (em memória) e quer preservá-los:

1. **Exportar dados da versão antiga:**
```python
# Use a ferramenta list_episodes para ver o que tem
# Anote os episódios importantes
```

2. **Iniciar nova versão:**
```bash
./start_mcp_complete.sh
```

3. **Re-adicionar episódios importantes:**
```python
# Use add_episode com os dados anotados
```

### Passo 5: Configurar Recursos Avançados (Opcional)

#### Ativar Sincronização com Turso:
```python
# Ao adicionar episódios, use:
add_episode(name="...", content="...", sync_to_turso=True)

# Ou sincronize tudo de uma vez:
sync_all_to_turso()
```

#### Configurar Webhooks:
```python
# Registrar webhook para notificações
register_webhook(
    url="https://seu-servidor.com/webhook",
    event_type="*"  # ou específico: "add_episode"
)
```

#### Configurar Backup Automático:
```python
# Criar backup manual
backup_database(description="Backup antes da migração")

# Backups são salvos em ~/.graphiti/backups/
```

## 🔍 Verificar Migração

### Testar Persistência:
```python
1. add_episode("Teste", "Conteúdo teste")
2. Reiniciar servidor
3. list_episodes()  # Deve mostrar o episódio
```

### Testar Busca Avançada:
```python
# Busca semântica
search_knowledge("conceito similar", search_type="semantic")

# Busca com filtros
search_knowledge("termo", filters={"category": "docs"})
```

### Verificar Status:
```python
get_status()  # Mostra versão e recursos disponíveis
```

## ⚠️ Notas Importantes

1. **Dados em RAM são perdidos** ao migrar da versão básica
2. **Backup antes de migrar** se tiver dados importantes
3. **Versão Complete** cria banco em `~/.graphiti/graphiti.db`
4. **Versão Integrated** cria banco em `~/.graphiti/graphiti_local.db`
5. **Índices são criados automaticamente** na primeira execução

## 🎯 Recomendação

Para a maioria dos casos, use a **versão Complete** (`graphiti_mcp_complete.py`):
- ✅ Todas as funcionalidades principais
- ✅ Persistência local garantida
- ✅ Performance otimizada
- ✅ Sem dependências externas complexas

Use a **versão Integrated** apenas se precisar:
- Sincronização com Turso Cloud
- Webhooks para integrações externas
- Backup distribuído

## 📞 Suporte

Se tiver problemas na migração:
1. Verifique os logs em `~/.graphiti/audit.log`
2. Use `get_logs()` para ver operações recentes
3. Execute `optimize_database()` se houver lentidão

---
*Guia de Migração - Graphiti-Turso MCP v3.0*