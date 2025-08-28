# Requirements Document

## Introduction

Esta funcionalidade visa sincronizar os controles do timer com a reprodução da música de fundo selecionada. Quando o usuário iniciar o timer, a música deve começar automaticamente (se uma música estiver selecionada). Quando pausar o timer, a música deve pausar também. Isso criará uma experiência mais integrada e fluida para o usuário durante sessões de estudo ou trabalho.

## Requirements

### Requirement 1

**User Story:** Como usuário do cronômetro, eu quero que a música de fundo inicie automaticamente quando eu iniciar o timer, para que eu não precise gerenciar dois controles separadamente.

#### Acceptance Criteria

1. WHEN o usuário clica no botão "Iniciar" do timer AND uma música está selecionada (preset ou custom) THEN o sistema SHALL iniciar a reprodução da música automaticamente
2. WHEN o usuário usa os botões de tempo rápido (5min, 10min) AND uma música está selecionada THEN o sistema SHALL iniciar a música junto com o timer
3. WHEN o usuário define um tempo personalizado e clica "Definir e Iniciar" AND uma música está selecionada THEN o sistema SHALL iniciar a música automaticamente
4. WHEN não há música selecionada AND o usuário inicia o timer THEN o sistema SHALL iniciar apenas o timer sem tentar reproduzir música

### Requirement 2

**User Story:** Como usuário do cronômetro, eu quero que a música pause automaticamente quando eu pausar o timer, para manter a sincronização entre timer e música.

#### Acceptance Criteria

1. WHEN o usuário clica no botão "Pausar" do timer AND uma música está tocando THEN o sistema SHALL pausar a reprodução da música
2. WHEN o usuário clica novamente em "Iniciar" após pausar AND uma música estava tocando antes THEN o sistema SHALL retomar a reprodução da música
3. WHEN o timer é pausado AND não há música tocando THEN o sistema SHALL apenas pausar o timer sem afetar a música

### Requirement 3

**User Story:** Como usuário do cronômetro, eu quero que a música pare automaticamente quando o timer terminar ou for resetado, para que a experiência seja completa e consistente.

#### Acceptance Criteria

1. WHEN o timer chega a 00:00 AND uma música está tocando THEN o sistema SHALL parar a reprodução da música automaticamente
2. WHEN o usuário clica no botão "Resetar" AND uma música está tocando THEN o sistema SHALL parar a reprodução da música
3. WHEN o timer termina naturalmente THEN o sistema SHALL manter a funcionalidade atual de notificação E parar a música

### Requirement 4

**User Story:** Como usuário do cronômetro, eu quero manter o controle manual da música independentemente do timer, para ter flexibilidade quando necessário.

#### Acceptance Criteria

1. WHEN o usuário clica no botão "Reproduzir" da seção de música THEN o sistema SHALL iniciar a música independentemente do estado do timer
2. WHEN o usuário clica no botão "Parar" da seção de música THEN o sistema SHALL parar a música independentemente do estado do timer
3. WHEN o usuário seleciona uma nova música no dropdown THEN o sistema SHALL trocar a música independentemente do estado do timer
4. WHEN o usuário cola um novo link do YouTube THEN o sistema SHALL permitir reproduzir independentemente do estado do timer

### Requirement 5

**User Story:** Como usuário do cronômetro, eu quero feedback visual claro sobre o estado da sincronização entre timer e música, para entender quando eles estão trabalhando juntos.

#### Acceptance Criteria

1. WHEN uma música está selecionada AND o timer está rodando THEN o sistema SHALL mostrar indicação visual de que música e timer estão sincronizados
2. WHEN não há música selecionada THEN o sistema SHALL mostrar que apenas o timer está ativo
3. WHEN há erro na reprodução da música THEN o sistema SHALL mostrar mensagem de erro sem afetar o funcionamento do timer
4. WHEN a música é controlada manualmente THEN o sistema SHALL atualizar o status visual adequadamente
