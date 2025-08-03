#!/bin/bash
# 🛑 Script para Parar o PRP Agent
# ================================

echo "🛑 Parando PRP Agent..."

# Verificar PID file
if [ -f "prp-agent.pid" ]; then
    PID=$(cat prp-agent.pid)
    if ps -p $PID > /dev/null 2>&1; then
        echo "📋 Parando processo PID: $PID"
        kill $PID
        
        # Aguardar processo parar
        echo "⏳ Aguardando processo parar..."
        for i in {1..10}; do
            if ! ps -p $PID > /dev/null 2>&1; then
                echo "✅ Processo parado com sucesso!"
                rm -f prp-agent.pid
                break
            fi
            sleep 1
        done
        
        # Se ainda não parou, forçar
        if ps -p $PID > /dev/null 2>&1; then
            echo "⚠️  Forçando parada..."
            kill -9 $PID
            rm -f prp-agent.pid
            echo "✅ Processo forçado a parar!"
        fi
    else
        echo "⚠️  Processo PID $PID não está rodando"
        rm -f prp-agent.pid
    fi
else
    # Tentar parar por porta (verificar ambas as portas: 8000 e 5678)
    PID=$(lsof -ti:8000)
    PID2=$(lsof -ti:5678)
    
    if [ ! -z "$PID" ]; then
        echo "📋 Encontrado processo na porta 8000 (PID: $PID)"
        kill $PID
        echo "✅ Processo parado!"
    elif [ ! -z "$PID2" ]; then
        echo "📋 Encontrado processo na porta 5678 (PID: $PID2)"
        kill $PID2
        echo "✅ Processo parado!"
    else
        echo "ℹ️  Nenhum processo encontrado nas portas 8000 ou 5678"
    fi
fi

# Limpar arquivos temporários
if [ -f "prp-agent.log" ]; then
    echo "📄 Log salvo em: prp-agent.log"
fi

echo "🏁 PRP Agent parado!"