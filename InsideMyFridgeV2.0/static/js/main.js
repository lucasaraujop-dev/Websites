// ==========================================================================
// 1. MAPEAMENTO DOS ELEMENTOS DA TELA (DOM)
// ==========================================================================
// Pegamos os elementos pelo ID para manipularmos via JS sem precisar re-procurar no código toda hora
const recipeForm = document.getElementById('recipe-form');
const btnSubmit = document.getElementById('btn-submit');
const btnText = btnSubmit.querySelector('.btn-text');
const spinner = btnSubmit.querySelector('.spinner');

// Cena de carregamento (tábua + tomate + tigela)
const loadingCard = document.getElementById('loading-card');
const loadingText = document.getElementById('loading-text');

// Elementos do cartão de resultado (que começa escondido)
const recipeResult = document.getElementById('recipe-result');
const recipeTitle = document.getElementById('recipe-title');
const recipeTime = document.getElementById('recipe-time');
const recipeDifficulty = document.getElementById('recipe-difficulty');
const recipeIngredients = document.getElementById('recipe-ingredients');
const recipeSteps = document.getElementById('recipe-steps');
const recipeTipContainer = document.getElementById('recipe-tip-container');
const recipeTip = document.getElementById('recipe-tip');

// Mensagens que vão se alternando enquanto a receita é gerada
const LOADING_MESSAGES = [
    'Analisando os ingredientes...',
    'Cortando o tomate...',
    'Misturando a salada...',
    'Temperando a receita...',
    'Testando combinações...',
    'Quase pronto...'
];
let loadingMessageInterval = null;

// ==========================================================================
// 2. CAPTURA DO EVENTO DE ENVIO DO FORMULÁRIO
// ==========================================================================
recipeForm.addEventListener('submit', async (event) => {
    // Cancela o comportamento padrão do navegador de atualizar/recarregar a página
    event.preventDefault();

    // Pega o texto digitado na caixa de ingredientes
    const ingredientesInput = document.getElementById('ingredientes').value.trim();

    // Pega todas as tags/filtros que estiverem marcadas (checked)
    const filtrosMarcados = Array.from(document.querySelectorAll('input[name="filtros"]:checked'))
                                 .map(checkbox => checkbox.value);

    // Validação simples: não envia se estiver vazio
    if (!ingredientesInput) {
        alert('Por favor, informe ao menos um ingrediente!');
        return;
    }

    // Liga o estado de carregamento (desativa o botão, mostra o spinner e a cena animada)
    setLoadingState(true);

    try {
        // Envia os dados via requisição HTTP POST para a rota '/gerar-receita' do Flask
        const response = await fetch('/gerar-receita', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                ingredientes: ingredientesInput,
                filtros: filtrosMarcados
            })
        });

        const data = await response.json();

        // Se o Flask/Gemini retornar algum erro HTTP
        if (!response.ok) {
            throw new Error(data.erro || 'Ocorreu um erro ao gerar a receita.');
        }

        // Se tudo deu certo, desenha a receita na tela!
        renderRecipe(data);

    } catch (error) {
        console.error('Erro ao buscar receita:', error);
        alert(`Ops! ${error.message}`);
    } finally {
        // Desliga o estado de carregamento (restaura o botão normal e esconde a cena animada)
        setLoadingState(false);
    }
});

// ==========================================================================
// 3. FUNÇÃO PARA ALTERNAR O BOTÃO E A CENA DE CARREGAMENTO
// ==========================================================================
function setLoadingState(isLoading) {
    if (isLoading) {
        btnSubmit.disabled = true; // Impede duplo clique
        btnText.textContent = 'Gerando receita...';
        spinner.classList.remove('hidden'); // Exibe a animação giratória do botão

        // Esconde um resultado anterior e mostra a cena da cozinha (tábua + tigela)
        recipeResult.classList.add('hidden');
        loadingCard.classList.remove('hidden');
        loadingCard.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Alterna as mensagens abaixo da animação a cada 1.8s
        let messageIndex = 0;
        loadingText.textContent = LOADING_MESSAGES[messageIndex];
        loadingMessageInterval = setInterval(() => {
            messageIndex = (messageIndex + 1) % LOADING_MESSAGES.length;
            loadingText.textContent = LOADING_MESSAGES[messageIndex];
        }, 1800);

    } else {
        btnSubmit.disabled = false;
        btnText.textContent = '✨ Criar receita com IA';
        spinner.classList.add('hidden'); // Oculta a animação giratória

        // Esconde a cena da cozinha e para a troca de mensagens
        loadingCard.classList.add('hidden');
        clearInterval(loadingMessageInterval);
    }
}

// ==========================================================================
// 4. FUNÇÃO PARA INJETAR A RECEITA NO HTML
// ==========================================================================
function renderRecipe(recipe) {
    // Insere título, tempo e dificuldade retornados do backend
    recipeTitle.textContent = recipe.nome_receita;
    recipeTime.textContent = `⏱️ ${recipe.tempo_preparo}`;
    recipeDifficulty.textContent = `📊 ${recipe.dificuldade}`;

    // Limpa receitas antigas que pudessem estar salvas na tela
    recipeIngredients.innerHTML = '';
    recipeSteps.innerHTML = '';

    // Preenche a lista de ingredientes (Cria uma tag <li> para cada item)
    recipe.ingredientes.forEach(item => {
        const li = document.createElement('li');
        li.textContent = item;
        recipeIngredients.appendChild(li);
    });

    // Preenche o modo de preparo passo a passo (Cria uma tag <li> para cada passo)
    recipe.passo_a_passo.forEach(passo => {
        const li = document.createElement('li');
        li.textContent = passo;
        recipeSteps.appendChild(li);
    });

    // Se houver Dica do Chef no JSON, exibe a caixinha amarela
    if (recipe.dica_do_chef) {
        recipeTip.textContent = recipe.dica_do_chef;
        recipeTipContainer.classList.remove('hidden');
    } else {
        recipeTipContainer.classList.add('hidden');
    }

    // Exibe o cartão do resultado removendo a classe 'hidden'
    recipeResult.classList.remove('hidden');

    // Rola a página suavemente até o cartão da receita
    recipeResult.scrollIntoView({ behavior: 'smooth' });
}
