# Design Document

## Overview

Esta funcionalidade implementará a sincronização automática entre os controles do timer e a reprodução de música de fundo. O sistema detectará quando uma música está selecionada e coordenará automaticamente o início, pausa e parada da música com as ações correspondentes do timer, mantendo a flexibilidade dos controles manuais existentes.

## Architecture

### Current State Analysis

O sistema atual possui:

- **Timer System**: Gerencia contagem regressiva com funções `startTimer()`, `pauseTimer()`, `resetTimer()`
- **Music System**: Gerencia reprodução via YouTube embed com funções `playYouTube()`, `stopMusic()`
- **Event Handlers**: Listeners separados para controles de timer e música
- **State Management**: Timer state é persistido, música não tem estado persistido

### Proposed Architecture

A sincronização será implementada através de:

1. **Music State Tracker**: Rastreamento do estado atual da música (selecionada, tocando, pausada)
2. **Sync Controller**: Coordenador central que gerencia a sincronização
3. **Enhanced Event Handlers**: Modificação dos handlers existentes para incluir sincronização
4. **Status Indicator**: Feedback visual do estado de sincronização

## Components and Interfaces

### 1. Music State Manager

```javascript
const musicState = {
  isSelected: false, // há música selecionada?
  isPlaying: false, // música está tocando?
  currentUrl: "", // URL da música atual
  syncEnabled: true, // sincronização ativa?
  lastAction: "manual", // 'manual' | 'timer-sync'
};
```

**Interface:**

- `getMusicState()`: Retorna estado atual da música
- `setMusicSelected(url)`: Marca música como selecionada
- `setMusicPlaying(playing)`: Atualiza status de reprodução
- `isMusicAvailableForSync()`: Verifica se música pode ser sincronizada

### 2. Sync Controller

**Interface:**

- `syncMusicWithTimer(action)`: Coordena música com ação do timer
- `handleTimerStart()`: Lógica para início do timer
- `handleTimerPause()`: Lógica para pausa do timer
- `handleTimerStop()`: Lógica para parada/reset do timer
- `handleManualMusicControl()`: Desabilita sync temporariamente para controle manual

### 3. Enhanced Timer Functions

Modificações nas funções existentes:

- `startTimer()` → `startTimerWithSync()`
- `pauseTimer()` → `pauseTimerWithSync()`
- `resetTimer()` → `resetTimerWithSync()`
- `startCurrentTimer()` → `startCurrentTimerWithSync()`

### 4. Enhanced Music Functions

Modificações nas funções existentes:

- `playYouTube()` → Atualizar music state
- `stopMusic()` → Atualizar music state
- Adicionar `pauseMusic()` para pausar sem parar completamente

## Data Models

### Music Sync State

```javascript
{
  musicSelected: boolean,
  musicUrl: string,
  isPlaying: boolean,
  isPaused: boolean,
  syncEnabled: boolean,
  lastSyncAction: 'start' | 'pause' | 'stop' | 'manual',
  timestamp: number
}
```

### Timer Integration Points

```javascript
{
  timerAction: 'start' | 'pause' | 'reset',
  shouldSyncMusic: boolean,
  musicAction: 'play' | 'pause' | 'stop' | 'none'
}
```

## Error Handling

### Music Loading Errors

- **Scenario**: YouTube embed falha ao carregar
- **Handling**: Timer continua normalmente, exibe mensagem de erro da música
- **Recovery**: Permite tentar novamente ou selecionar outra música

### Sync Conflicts

- **Scenario**: Usuário controla música manualmente durante timer ativo
- **Handling**: Desabilita sync temporariamente, permite controle manual
- **Recovery**: Re-habilita sync na próxima ação do timer

### Network Issues

- **Scenario**: Perda de conexão durante reprodução
- **Handling**: Timer continua, música para naturalmente
- **Recovery**: Tenta reconectar quando timer for pausado/reiniciado

## Testing Strategy

### Unit Tests

1. **Music State Management**

   - Teste de detecção de música selecionada
   - Teste de mudanças de estado (playing/paused/stopped)
   - Teste de validação de URLs do YouTube

2. **Sync Logic**

   - Teste de sincronização timer → música
   - Teste de controle manual sobrepondo sync
   - Teste de estados edge (música sem URL, timer sem tempo)

3. **Integration Points**
   - Teste de modificações nas funções de timer existentes
   - Teste de modificações nas funções de música existentes

### Integration Tests

1. **User Workflows**

   - Fluxo completo: selecionar música → iniciar timer → pausar → retomar → finalizar
   - Fluxo com controle manual: iniciar sync → controlar música manualmente → retomar sync
   - Fluxo sem música: usar timer normalmente sem música selecionada

2. **Error Scenarios**
   - Timer com música inválida
   - Perda de conexão durante reprodução
   - Múltiplas ações rápidas (spam de botões)

### Browser Compatibility Tests

- Teste em diferentes navegadores (Chrome, Firefox, Safari, Edge)
- Teste de autoplay policies (alguns navegadores bloqueiam autoplay)
- Teste de iframe embed permissions

## Implementation Phases

### Phase 1: Core Sync Infrastructure

- Implementar Music State Manager
- Criar Sync Controller básico
- Adicionar função `pauseMusic()`

### Phase 2: Timer Integration

- Modificar funções de timer para incluir sync
- Implementar lógica de detecção de música selecionada
- Adicionar error handling básico

### Phase 3: Enhanced UX

- Implementar status visual de sincronização
- Adicionar controle manual override
- Implementar persistência de preferências de sync

### Phase 4: Polish & Testing

- Testes abrangentes
- Refinamento de UX
- Documentação de uso
