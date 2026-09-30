import os
import json

from flask import Flask, render_template, request, jsonify
from dotenv import load_dotenv

from google import genai
from google.genai import types

from pydantic import BaseModel, Field


# ============================================================
# CONFIGURAÇÃO
# ============================================================

# Carrega as variáveis do arquivo .env
load_dotenv()

# Inicializa o Flask
app = Flask(__name__)

# Pega a API Key do arquivo .env
api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    raise ValueError(
        "GEMINI_API_KEY não encontrada! "
        "Verifique se ela está configurada corretamente no arquivo .env."
    )

# Modelo utilizado
GEMINI_MODEL = "gemini-3.7-flash"

# Inicializa o cliente Gemini
client = genai.Client(api_key=api_key)


# ============================================================
# SCHEMA DA RECEITA
# ============================================================

class ReceitaSchema(BaseModel):
    nome_receita: str = Field(
        description="Nome criativo da receita"
    )

    tempo_preparo: str = Field(
        description="Tempo aproximado de preparo. Exemplo: '20 minutos'"
    )

    dificuldade: str = Field(
        description="Nível de dificuldade: Fácil, Média ou Difícil"
    )

    ingredientes: list[str] = Field(
        description="Lista dos ingredientes com quantidades aproximadas"
    )

    passo_a_passo: list[str] = Field(
        description="Lista ordenada com os passos de preparo"
    )

    dica_do_chef: str = Field(
        description="Uma dica útil para melhorar o prato ou evitar desperdício"
    )


# ============================================================
# ROTA PRINCIPAL
# ============================================================

@app.route("/")
def index():
    return render_template("index.html")


# ============================================================
# GERAR RECEITA
# ============================================================

@app.route("/gerar-receita", methods=["POST"])
def gerar_receita():

    try:

        # Recebe os dados enviados pelo JavaScript
        dados = request.get_json()

        # Verifica se recebeu JSON corretamente
        if not dados:
            return jsonify({
                "erro": "Nenhum dado foi enviado."
            }), 400

        ingredientes = dados.get("ingredientes", "").strip()
        filtros = dados.get("filtros", [])


        # ----------------------------------------------------
        # VALIDAÇÕES
        # ----------------------------------------------------

        if not ingredientes:
            return jsonify({
                "erro": "Nenhum ingrediente foi informado."
            }), 400


        # Garante que filtros seja uma lista
        if not isinstance(filtros, list):
            filtros = []


        string_filtros = (
            ", ".join(filtros)
            if filtros
            else "Nenhuma preferência específica"
        )


        # ----------------------------------------------------
        # PROMPT
        # ----------------------------------------------------

        prompt = f"""
Você é um chef de cozinha criativo especializado em criar receitas
deliciosas e evitar desperdício alimentar.

Crie UMA receita prática utilizando prioritariamente os ingredientes
que o usuário possui.

INGREDIENTES DISPONÍVEIS:
{ingredientes}

PREFERÊNCIAS DO USUÁRIO:
{string_filtros}

REGRAS IMPORTANTES:

- Utilize prioritariamente os ingredientes informados.
- Você pode assumir que o usuário possui ingredientes básicos:
  óleo, azeite, sal, pimenta e água.
- Não invente ingredientes caros ou difíceis de encontrar sem necessidade.
- Crie uma receita realmente possível de preparar.
- Seja criativo com o nome da receita.
- Os passos devem ser claros e fáceis de seguir.
- Responda em Português do Brasil.
"""


        # ----------------------------------------------------
        # CHAMADA PARA O GEMINI
        # ----------------------------------------------------

        response = client.models.generate_content(

            model=GEMINI_MODEL,

            contents=prompt,

            config=types.GenerateContentConfig(

                response_mime_type="application/json",

                response_schema=ReceitaSchema,

                temperature=0.7,

            ),
        )


        # ----------------------------------------------------
        # VERIFICA A RESPOSTA
        # ----------------------------------------------------

        if not response.text:
            return jsonify({
                "erro": "A IA não retornou uma resposta válida."
            }), 500


        # Converte para JSON para garantir que está válido
        receita = json.loads(response.text)


        # Retorna o JSON para o main.js
        return jsonify(receita), 200


    # ========================================================
    # ERROS
    # ========================================================

    except json.JSONDecodeError:

        print("Erro: O Gemini retornou um JSON inválido.")

        return jsonify({
            "erro": "A IA retornou uma resposta em formato inválido."
        }), 500


    except Exception as e:

        print("\n==============================")
        print("ERRO AO GERAR RECEITA")
        print(e)
        print("==============================\n")

        return jsonify({
            "erro": "Não foi possível gerar a receita no momento."
        }), 500


# ============================================================
# INICIAR SERVIDOR
# ============================================================

if __name__ == "__main__":

    app.run(
        debug=True,
        port=5000
    )