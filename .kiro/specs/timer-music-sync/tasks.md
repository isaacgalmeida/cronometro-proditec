# Implementation Plan

- [x] 1. Implementar Music State Manager

  - Criar objeto `musicState` global para rastrear estado da música
  - Implementar funções `getMusicState()`, `setMusicSelected()`, `setMusicPlaying()`
  - Adicionar função `isMusicAvailableForSync()` para verificar se música pode ser sincronizada
  - _Requirements: 1.4, 4.1, 4.2, 4.3, 4.4_

- [x] 2. Criar função pauseMusic() para controle granular

  - Implementar função `pauseMusic()` que pausa o iframe do YouTube sem resetar
  - Modificar função `stopMusic()` para atualizar o music state
  - Adicionar lógica para distinguir entre pause e stop da música
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 3. Implementar Sync Controller básico

  - Criar função `syncMusicWithTimer(action)` que coordena música com timer
  - Implementar `handleTimerStart()`, `handleTimerPause()`, `handleTimerStop()`
  - Adicionar lógica para detectar quando música está selecionada antes de sincronizar
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 3.1, 3.2_

- [x] 4. Modificar funções de timer para incluir sincronização

  - Atualizar `startTimer()` para chamar sync controller quando música está selecionada
  - Modificar `startCurrentTimer()` para incluir sincronização automática
  - Atualizar `pauseTimer()` para pausar música quando apropriado
  - Modificar `resetTimer()` para parar música quando timer é resetado
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 3.1, 3.2_

- [x] 5. Atualizar funções de música para gerenciar state

  - Modificar `playYouTube()` para atualizar music state quando música inicia
  - Atualizar event listeners de música para marcar ações como manuais
  - Modificar seleção de música preset para atualizar state adequadamente
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 5.4_

- [x] 6. Implementar detecção de música selecionada

  - Adicionar lógica para detectar quando música preset está selecionada
  - Implementar detecção de URL customizada válida no campo de input
  - Criar função helper para verificar se há música disponível para sync
  - _Requirements: 1.4, 5.1, 5.2_

- [x] 7. Adicionar feedback visual de sincronização

  - Implementar indicador visual quando timer e música estão sincronizados
  - Mostrar status quando apenas timer está ativo (sem música)
  - Adicionar mensagens de erro quando música falha mas timer continua
  - Atualizar `showMusicStatus()` para incluir informações de sincronização
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 8. Implementar tratamento de erros de sincronização

  - Adicionar try-catch em operações de música para não afetar timer
  - Implementar fallback quando YouTube embed falha ao carregar
  - Criar lógica para continuar timer normalmente quando música tem problemas
  - _Requirements: 5.3, 1.4_

- [x] 9. Adicionar controle manual override

  - Implementar lógica para desabilitar sync temporariamente quando usuário controla música manualmente
  - Criar função `handleManualMusicControl()` para gerenciar override
  - Re-habilitar sync automaticamente na próxima ação do timer
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 10. Integrar sincronização com tempo personalizado

  - Modificar event listener do botão "Definir e Iniciar" para incluir sync
  - Garantir que música inicia quando tempo personalizado é definido e iniciado
  - _Requirements: 1.3_

- [x] 11. Testar e refinar funcionalidade completa

  - Testar fluxo completo: selecionar música → iniciar timer → pausar → retomar → finalizar
  - Testar cenários sem música selecionada
  - Testar controle manual durante timer ativo
  - Verificar que timer funciona normalmente quando música falha
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 3.1, 3.2, 4.1, 4.2, 4.3, 4.4, 5.1, 5.2, 5.3, 5.4_

- [x] 12. Implementar YouTube Player API para controle adequado de pause/resume

  - Substituir iframe simples pela YouTube Player API
  - Implementar funções de pause/resume reais usando YT.Player
  - Manter compatibilidade com sistema de sincronização existente
  - Adicionar tratamento de erros para casos onde API não carrega
  - _Requirements: 2.1, 2.2, 2.3_
