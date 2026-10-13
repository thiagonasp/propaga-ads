# Propaga Ads — novo layout para Vercel

Site institucional redesenhado: identidade verde, fundo escuro e áreas claras; serviços, método, experiência, dashboards, e-books, FAQ e contato. Sem foto pessoal e sem o antigo bloco “Descreva sua empresa...”. Home e catálogo têm CSS e JavaScript incorporados ao HTML para evitar dependência de carregamento desses arquivos.

## Atualizar o projeto existente
1. Extraia o ZIP.
2. No mesmo repositório que está conectado à Vercel, substitua `public/` e `vercel.json` pelos arquivos desta pasta. Preserve arquivos extras que você tenha criado fora dessas pastas.
3. A raiz do repositório deve conter `public/index.html` e `vercel.json`. Evite `propaga-ads/propaga-ads/public`.
4. Faça o commit na branch de produção conectada à Vercel. A integração fará uma nova publicação.
5. Configuração do projeto: Framework Other; sem comando de build; Output Directory public; Root Directory a pasta que contém vercel.json.
6. Abra o endereço Vercel e confira Home, menu em celular, contato e páginas internas.

## Contato
O formulário abre o WhatsApp com uma mensagem preenchida. O visitante confirma o envio no WhatsApp. Não há envio por email, armazenamento de leads ou novo rastreamento nessa versão. O endereço de email é um link para contato direto.

## Conteúdo e rotas
- `/`: nova Home.
- `/trafego-com-performance`: página de performance recuperada, com exemplos de dashboard identificados como ilustrativos.
- `/e-books`: catálogo redesenhado.
- `/ebook-publico-ideal`: página do e-book com seu checkout original.
- `/comprador-ideal-para-corretores-de-imoveis`: página do e-book com seu checkout original.

As logos usadas na Home foram obtidas do site anterior. Não foram acrescentados depoimentos ou resultados de campanhas. As páginas internas de venda mantêm o conteúdo original recuperado. Imagens usadas são locais; não há dependência de arquivos hospedados no Wix. Foto pessoal excluída do pacote.

## Validação
Verificados arquivos e links locais das cinco páginas, âncoras, IDs, sitemap, metadados estruturados e configuração Vercel. Menu e montagem da mensagem de contato foram exercitados por script, sem enviar mensagem. Contraste de botões e texto de contato ajustado. Não foi possível fazer validação visual em navegador neste ambiente; revisar a versão publicada em desktop e celular antes de trocar o domínio principal.

## Referências de estrutura
Cadastra: https://www.cadastra.com/
Monks: https://www.monks.com/solutions/performance-media
Composição própria para a Propaga Ads, sem copiar textos ou identidade das referências.

## Editar
Home: `public/index.html`. Catálogo: `public/e-books.html`. Cada página contém seus estilos e comportamento. `style.css` e `app.js` também estão disponíveis como fonte de referência, mas Home e catálogo não dependem deles. Se editar esses arquivos separadamente, replique a alteração nos blocos style/script do HTML correspondente.
