/* Editor · idiomas (sem DOM, testável em Node). O texto em português é a CHAVE: o que não tem tradução aparece em português.
   Projetos guardam só os ids técnicos dos blocos, então trocar de idioma nunca muda o jogo. Idiomas: pt-BR (padrão), en, es. */
(function (root) {
  const I = root.EditorI18n = root.EditorI18n || {};
  const EN = {
    // categorias e grupos
    'Movimento': 'Motion', 'Objeto': 'Object', 'Listas': 'Lists', 'Controle': 'Control', 'Variáveis': 'Variables', 'Câmera': 'Camera', 'Aparelho': 'Device', 'Ferramentas': 'Tools', 'Cena': 'Scene', 'Aparência': 'Looks', 'Som': 'Sound', 'Eventos': 'Events',
    'Valores': 'Values', 'Este objeto': 'This object', 'Contas': 'Math', 'Entrada': 'Input', 'Relógio e data': 'Clock and date',
    // eventos
    'quando o jogo começa': 'when the game starts', 'a cada quadro (60 vezes por segundo)': 'every frame (60 times per second)', 'quando este objeto colidir': 'when this object collides', 'quando clicarem neste objeto': 'when this object is clicked', 'quando este objeto entrar/ficar numa zona (gatilho)': 'when this object enters/stays in a zone (trigger)',
    // valores
    'número': 'number', 'texto': 'text', 'variável': 'variable', 'x deste objeto': 'x of this object', 'y deste objeto': 'y of this object', 'velocidade x': 'speed x', 'velocidade y': 'speed y', 'setas: eixo x': 'arrows: x axis', 'setas: eixo y': 'arrows: y axis', 'tempo de jogo (s)': 'game time (s)', 'aleatório entre…': 'random between…', 'nome do outro objeto': 'name of the other object', 'atributo de um objeto': 'attribute of an object', 'conta': 'math',
    'quantos objetos com etiqueta': 'how many objects with tag', 'item N da lista': 'item N of list', 'tamanho da lista': 'list length', 'item aleatório da lista': 'random list item', 'item atual (dentro de "para cada item")': 'current item (inside "for each item")', 'variável local': 'local variable',
    'relógio: hora': 'clock: hour', 'relógio: minuto': 'clock: minute', 'relógio: segundo': 'clock: second', 'data: dia do mês': 'date: day of month', 'data: mês': 'date: month', 'data: ano': 'date: year', 'data: dia da semana (0=domingo)': 'date: weekday (0=Sunday)',
    'aparelho: sistema (android, ios, windows…)': 'device: system (android, ios, windows…)', 'aparelho: tipo (celular, tablet, computador)': 'device: type (phone, tablet, computer)', 'aparelho: tem toque?': 'device: has touch?', 'aparelho: idioma': 'device: language', 'aparelho: está online?': 'device: is online?', 'aparelho: largura da janela': 'device: window width', 'aparelho: altura da janela': 'device: window height', 'aparelho: orientação (retrato, paisagem)': 'device: orientation (portrait, landscape)', 'aparelho: modo escuro?': 'device: dark mode?',
    'mouse: posição x (mundo)': 'mouse: x position (world)', 'mouse: posição y (mundo)': 'mouse: y position (world)',
    'resto': 'remainder', 'menor de': 'smaller of', 'maior de': 'larger of',
    // condições
    'comparar': 'compare', 'tecla': 'key', 'e (ambas)': 'and (both)', 'ou (uma delas)': 'or (either)', 'não': 'not', 'tem etiqueta': 'has tag', 'mouse': 'mouse', 'mouse sobre objeto': 'mouse over object', 'lista contém': 'list contains', 'existe partida salva': 'saved game exists',
    'direção/ação': 'direction/action', 'qualquer tecla': 'any key', 'segurada': 'held', 'apertada agora': 'pressed now', 'clicou agora': 'clicked now', 'está apertado': 'is pressed', 'esquerda': 'left', 'direita': 'right', 'cima': 'up', 'baixo': 'down', 'acao': 'action',
    'então': 'then', 'senão': 'else', 'faça': 'do', 'Todos': 'All', 'Nenhum bloco encontrado.': 'No blocks found.', '+ bloco…': '+ block…', '+ evento…': '+ event…', '＋ bloco': '＋ block', '＋ evento': '＋ event',
    'Buscar bloco… (ex.: mover, lista, som)': 'Search blocks… (e.g. move, list, sound)', 'Buscar evento…': 'Search events…',
    // blocos (menus e partes)
    'mudar x em': 'change x by', 'por segundo': 'per second', 'mudar y em': 'change y by', 'andar com as setas a': 'walk with the arrows at', 'ir para x': 'go to x', 'y': 'y', 'velocidade x =': 'speed x =', 'velocidade y =': 'speed y =',
    'mudar atributo de um objeto': 'change an object attribute', 'mudar': 'set', 'para': 'to', 'somar a um atributo de um objeto': 'add to an object attribute', 'somar': 'add', 'em': 'to',
    'adicionar à lista': 'add to list', 'adicionar': 'add', 'à lista': 'to list', 'trocar item da lista': 'replace list item', 'trocar o item': 'replace item', 'da lista': 'of list', 'por': 'with', 'remover item da lista': 'remove list item', 'remover o item': 'remove item', 'esvaziar lista': 'clear list', 'esvaziar a lista': 'clear the list',
    'para cada item da lista': 'for each item in list', 'faça (use "item atual")': 'do (use "current item")', 'escrever no output': 'write to output', 'criar variável local': 'create local variable', '(vale só neste script/evento)': '(only valid in this script/event)',
    'definir variável local': 'set local variable', 'definir local': 'set local', 'somar a variável local': 'add to local variable', 'à local': 'to local', 'salvar partida': 'save game', 'salvar partida no espaço': 'save game in slot', 'carregar partida': 'load game', 'carregar partida do espaço': 'load game from slot', '(se existir)': '(if it exists)',
    'aguardar N segundos': 'wait N seconds', 'aguardar': 'wait', 'segundos e então continuar': 'seconds, then continue', 'alterar um atributo aos poucos': 'change an attribute gradually', 'alterar': 'change', 's, curva': 's, curve', 'suave': 'smooth', 'constante': 'constant', 'acelera': 'speeds up', 'desacelera': 'slows down',
    'tocar animação': 'play animation', 'ir até um ponto (desviando das paredes)': 'go to a point (avoiding walls)', 'ir': 'go', 'até x': 'to x', 'velocidade': 'speed', 'parar de andar pela rota': 'stop following the route', 'parar rota de': 'stop route of',
    'tremer a câmera': 'shake the camera', 'tremer câmera com força': 'shake camera with strength', 's': 's', 'escurecer / clarear a tela (fade)': 'fade the screen in / out', 'fade de': 'fade from', 'soltar partículas': 'emit particles', 'soltar': 'emit', 'partículas em x': 'particles at x', 'cor': 'color',
    'vibrar o aparelho': 'vibrate the device', 'vibrar por': 'vibrate for', 'ms': 'ms', 'tela cheia (ligar/desligar)': 'fullscreen (on/off)', 'ligar tela cheia': 'turn fullscreen on', 'sair da tela cheia': 'exit fullscreen',
    'tornar filho de outro objeto': 'make child of another object', 'tornar': 'make', 'filho de': 'child of', 'soltar do pai': 'detach from parent', 'do pai': 'from parent', 'dar etiqueta a um objeto': 'give an object a tag', 'dar a': 'give to', 'a etiqueta': 'the tag',
    'criar cópia de um objeto (modelo)': 'create a copy of an object (template)', 'criar cópia de': 'create copy of', 'em x': 'at x', 'para cada objeto com etiqueta': 'for each object with tag', 'para cada objeto com a etiqueta': 'for each object with the tag', 'faça (use "cada objeto")': 'do (use "each object")',
    'repetir N vezes': 'repeat N times', 'repetir': 'repeat', 'vezes (máx. 1000)': 'times (max 1000)', 'repetir enquanto': 'repeat while', '% de chance de': '% chance to', 'sair do script (parar aqui)': 'exit the script (stop here)', 'sair do script': 'exit the script',
    'observar valor': 'watch value', 'observar': 'watch', 'comentário': 'comment', 'comentário:': 'comment:', 'ir para a cena': 'go to scene', 'câmera: seguir objeto': 'camera: follow object', 'câmera segue': 'camera follows', 'câmera: zoom': 'camera: zoom', 'câmera: ir para x, y': 'camera: go to x, y', 'câmera vai para x': 'camera goes to x',
    'definir': 'set', 'se': 'if', 'mudar a cor para': 'set color to', 'criar objeto': 'create object', 'criar': 'create', 'círculo': 'circle', 'quadrado': 'square', 'de tamanho': 'of size', 'com física': 'with physics', 'parado (sólido)': 'still (solid)', 'sensor (atravessável)': 'sensor (pass-through)', 'sem colisão': 'no collision', 'script': 'script',
    'mudar o texto': 'set the text', 'mudar o texto para': 'set the text to', 'a cada … segundos': 'every … seconds', 'a cada': 'every', 'segundos faça': 'seconds do', 'tocar bipe': 'play beep', 'tocar bipe de': 'play beep of', 'Hz por': 'Hz for',
    'depois de … segundos (uma vez)': 'after … seconds (once)', 'depois de': 'after', 'segundos, fazer uma vez': 'seconds, do once', 'tocar som importado': 'play imported sound', 'volume': 'volume', 'uma vez': 'once', 'em repetição': 'looping', 'parar som importado': 'stop imported sound', 'parar som': 'stop sound',
    'tocar som pronto': 'play built-in sound', 'tocar som': 'play sound', 'bip': 'beep', 'moeda': 'coin', 'pulo': 'jump', 'acerto': 'hit', 'explosao': 'explosion', 'reiniciar o jogo': 'restart the game', 'remover este objeto': 'remove this object', 'remover o outro objeto (em colisão/gatilho)': 'remove the other object (in collision/trigger)'
  };
  const ES = {
    'Movimento': 'Movimiento', 'Objeto': 'Objeto', 'Listas': 'Listas', 'Controle': 'Control', 'Variáveis': 'Variables', 'Câmera': 'Cámara', 'Aparelho': 'Dispositivo', 'Ferramentas': 'Herramientas', 'Cena': 'Escena', 'Aparência': 'Apariencia', 'Som': 'Sonido', 'Eventos': 'Eventos',
    'Valores': 'Valores', 'Este objeto': 'Este objeto', 'Contas': 'Cuentas', 'Entrada': 'Entrada', 'Relógio e data': 'Reloj y fecha',
    'quando o jogo começa': 'cuando empieza el juego', 'a cada quadro (60 vezes por segundo)': 'en cada fotograma (60 veces por segundo)', 'quando este objeto colidir': 'cuando este objeto choque', 'quando clicarem neste objeto': 'cuando hagan clic en este objeto', 'quando este objeto entrar/ficar numa zona (gatilho)': 'cuando este objeto entre/esté en una zona (disparador)',
    'número': 'número', 'texto': 'texto', 'variável': 'variable', 'x deste objeto': 'x de este objeto', 'y deste objeto': 'y de este objeto', 'velocidade x': 'velocidad x', 'velocidade y': 'velocidad y', 'aleatório entre…': 'aleatorio entre…', 'atributo de um objeto': 'atributo de un objeto', 'conta': 'cuenta', 'variável local': 'variable local',
    'comparar': 'comparar', 'tecla': 'tecla', 'e (ambas)': 'y (ambas)', 'ou (uma delas)': 'o (una de ellas)', 'não': 'no', 'tem etiqueta': 'tiene etiqueta', 'mouse': 'ratón', 'lista contém': 'la lista contiene', 'esquerda': 'izquierda', 'direita': 'derecha', 'cima': 'arriba', 'baixo': 'abajo', 'acao': 'acción',
    'então': 'entonces', 'senão': 'si no', 'faça': 'hacer', 'Todos': 'Todos', 'Nenhum bloco encontrado.': 'No se encontraron bloques.', '+ bloco…': '+ bloque…', '+ evento…': '+ evento…', '＋ bloco': '＋ bloque', '＋ evento': '＋ evento',
    'mudar x em': 'cambiar x en', 'mudar y em': 'cambiar y en', 'ir para x': 'ir a x', 'para': 'a', 'somar': 'sumar', 'definir': 'definir', 'se': 'si', 'repetir': 'repetir', 'repetir N vezes': 'repetir N veces', 'vezes (máx. 1000)': 'veces (máx. 1000)', 'aguardar N segundos': 'esperar N segundos', 'criar objeto': 'crear objeto', 'tocar som': 'reproducir sonido', 'reiniciar o jogo': 'reiniciar el juego', 'remover este objeto': 'eliminar este objeto', 'mudar a cor para': 'cambiar el color a', 'mudar o texto': 'cambiar el texto', 'ir para a cena': 'ir a la escena', 'comentário': 'comentario'
  };
  const D = { en: EN, es: ES };
  let lang = 'pt-BR';
  I.idiomas = [['pt-BR', 'Português'], ['en', 'English'], ['es', 'Español']];
  I.atual = () => lang;
  I.definir = l => { if (l !== 'pt-BR' && !D[l]) return false; lang = l; return true; };
  I.tr = s => { const d = D[lang]; return d && typeof s === 'string' && Object.prototype.hasOwnProperty.call(d, s) ? d[s] : s; };
  I.guardar = () => { try { root.localStorage.setItem('motor.idioma', lang); } catch (x) {} };
  try { const s = root.localStorage && root.localStorage.getItem('motor.idioma'); if (s) I.definir(s); } catch (x) {}
  I.dicionario = l => D[l] || null;
})(typeof window !== 'undefined' ? window : globalThis);
