# Context Engineering Turso

Um projeto abrangente de engenharia de contexto que integra múltiplas tecnologias para criar um sistema de memória e conhecimento distribuído usando Turso, Sentry e MCP (Model Context Protocol).

## 🚀 Visão Geral

Este projeto implementa um sistema completo de engenharia de contexto que combina:

- **Turso Database**: Banco de dados distribuído para armazenamento de contexto
- **Sentry**: Monitoramento e observabilidade
- **MCP (Model Context Protocol)**: Integração com modelos de IA
- **Agentes de IA**: Sistemas inteligentes para gerenciamento de contexto
- **PRP (Pattern Recognition Protocol)**: Protocolos para reconhecimento de padrões

## 📁 Estrutura do Projeto

```
context-engineering-turso/
├── docs/                    # Documentação completa
├── mcp-turso/              # Servidor MCP para Turso
├── mcp-sentry/             # Servidor MCP para Sentry
├── prp-agent/              # Agente PRP principal
├── turso-agent/            # Agente especialista Turso
├── use-cases/              # Casos de uso e exemplos
├── sql/                    # Scripts e esquemas SQL
└── venv/                   # Ambiente virtual Python
```

## 🛠️ Tecnologias Principais

- **Python**: Linguagem principal para agentes e scripts
- **TypeScript/Node.js**: Servidores MCP
- **Turso**: Banco de dados distribuído
- **Sentry**: Monitoramento e observabilidade
- **FastAPI**: APIs REST
- **Pydantic**: Validação de dados
- **SQLAlchemy**: ORM para Python

## 🚀 Início Rápido

### Pré-requisitos

- Python 3.8+
- Node.js 18+
- Conta no Turso
- Conta no Sentry

### Instalação

1. **Clone o repositório**
```bash
git clone https://github.com/seu-usuario/context-engineering-turso.git
cd context-engineering-turso
```

2. **Configure o ambiente Python**
```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
# ou
venv\Scripts\activate     # Windows
pip install -r requirements.txt
```

3. **Configure as variáveis de ambiente**
```bash
# Copie os arquivos de exemplo
cp mcp-turso/turso-config.env.example mcp-turso/turso-config.env
cp prp-agent/prp_agent_env_sentry.example prp-agent/.env

# Configure suas credenciais
# TURSO_AUTH_TOKEN=seu_token_turso
# SENTRY_DSN=seu_dsn_sentry
```

4. **Inicie os servidores MCP**
```bash
# Terminal 1: Servidor Turso MCP
cd mcp-turso
npm install
npm start

# Terminal 2: Servidor Sentry MCP
cd mcp-sentry
npm install
npm start
```

## 📚 Documentação

A documentação completa está organizada em:

- **`docs/`**: Documentação geral do projeto
- **`docs-turso/`**: Documentação específica do Turso
- **`docs/mcp-integration/`**: Guias de integração MCP
- **`docs/prp-system/`**: Sistema PRP
- **`docs/sentry-monitoring/`**: Monitoramento Sentry

## 🔧 Uso

### Agente PRP Principal

```bash
cd prp-agent
python main.py
```

### Agente Turso Especialista

```bash
cd turso-agent
python main.py
```

### Sincronização de Dados

```bash
# Sincronizar documentação para Turso
cd mcp-turso/scripts
python sync-docs-to-turso.py
```

## 🧪 Testes

```bash
# Testes Python
pytest

# Testes Node.js
npm test
```

## 📊 Monitoramento

O projeto inclui monitoramento completo via Sentry:

- Rastreamento de erros
- Performance monitoring
- Release health
- Session replay

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## 🆘 Suporte

Para suporte e dúvidas:

- Abra uma issue no GitHub
- Consulte a documentação em `docs/`
- Verifique os logs em `logs/`

## 🔄 Status do Projeto

- ✅ Sistema MCP Turso funcionando
- ✅ Sistema MCP Sentry funcionando
- ✅ Agentes PRP implementados
- ✅ Documentação completa
- ✅ Monitoramento ativo
- 🔄 Integração contínua em desenvolvimento

---

**Desenvolvido com ❤️ para engenharia de contexto avançada** 