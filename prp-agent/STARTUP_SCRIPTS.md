# PRP Agent Startup Scripts

## Available Scripts

### 1. **start.sh** (Recommended)
Main startup script with automatic detection of dependencies.

```bash
./start.sh
```

Features:
- Activates virtual environment from `../venv`
- Checks if port 5678 is available
- Automatically uses `main_simple.py` if Sentry is not installed
- Runs server with auto-reload enabled

### 2. **start-simple.sh**
Minimal startup script without checks.

```bash
./start-simple.sh
```

### 3. **start-background.sh**
Runs the server in background mode with PID tracking.

```bash
./start-background.sh
```

Features:
- Runs server in background
- Saves PID to `prp-agent.pid`
- Logs output to `prp-agent.log`

### 4. **stop.sh**
Stops the running server (works with both port 8000 and 5678).

```bash
./stop.sh
```

## Server Details

- **Port**: 5678
- **Host**: 0.0.0.0 (accessible from network)
- **Main endpoints**:
  - http://localhost:5678/ - Root endpoint
  - http://localhost:5678/docs - Swagger documentation
  - http://localhost:5678/health - Health check

## Troubleshooting

1. **Port already in use**: Run `./stop.sh` to stop any running instance
2. **Module not found errors**: The script will automatically use `main_simple.py` if dependencies are missing
3. **Virtual environment issues**: Ensure `../venv` exists and is properly set up