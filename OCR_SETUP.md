# Configuração do OCR

O sistema utiliza **Tesseract.js** para processamento de OCR. Esta biblioteca funciona completamente em JavaScript/WASM, não requer instalação de binários do sistema.

## Instalação

### 1. Instalar dependências

```bash
npm install
```

Isso instalará automaticamente o `tesseract.js` e seus modelos de idioma.

### 2. Primeira execução

Na primeira vez que o OCR for usado, o Tesseract.js baixará automaticamente os modelos de idioma português. Isso pode levar alguns segundos.

## Uso

O endpoint `/api/ocr/processar` está pronto para uso. Basta enviar uma imagem de documento (CNH ou RG) e o sistema irá:

1. Processar a imagem com OCR
2. Extrair texto completo
3. Identificar e extrair:
   - Nome completo
   - CPF (com validação)
   - Data de nascimento (formato DD/MM/YYYY)

## Exemplo de Resposta

```json
{
  "success": true,
  "data": {
    "texto": "Texto completo extraído do documento...",
    "dados": {
      "nome": "JOÃO SILVA SANTOS",
      "cpf": "12345678900",
      "dataNascimento": "15/07/1990"
    },
    "confianca": 0.85
  },
  "message": "Documento processado com sucesso"
}
```

## Melhorias Futuras

Para melhorar a precisão, considere:

1. **Google Cloud Vision API**: Maior precisão, mas requer conta e tem custos
2. **AWS Textract**: Boa integração com AWS
3. **Azure Computer Vision**: Alternativa da Microsoft

Para integrar, substitua a função `processarImagemOCR` no arquivo `src/services/ocrService.js`.

## Troubleshooting

### OCR não está funcionando

1. Verifique se `tesseract.js` foi instalado:
```bash
npm list tesseract.js
```

2. Verifique os logs do servidor para erros

3. Teste com uma imagem de boa qualidade (alta resolução, boa iluminação)

### Precisão baixa

- Use imagens de alta qualidade
- Garanta boa iluminação na foto
- Documentos devem estar em foco
- Evite reflexos e sombras
