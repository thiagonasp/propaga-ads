# Propaga Ads — versão independente para Vercel

Primeira versão de migração. Home reconstruída usando os textos, imagens e identidade da página Wix. Performance e duas páginas de e-books recuperadas do HTML incorporado original. Catálogo de e-books acrescentado para dar acesso às duas páginas; o catálogo Wix estava vazio na inspeção.

## Publicar
1. Crie um repositório `propaga-ads` no GitHub, preferencialmente privado.
2. Extraia o ZIP e envie o conteúdo de `propaga-ads` (public/, vercel.json, README.md) para a raiz do repositório. Não envie apenas o ZIP.
3. Na Vercel: Add New > Project > importe o repositório.
4. Framework Preset: Other. Root Directory: raiz do repositório. Sem Build Command. Output Directory: public.
5. Deploy. Revise as páginas e links no endereço de teste.
6. Só após a revisão, adicione propagaads.com.br e www.propagaads.com.br em Settings > Domains. Aplique os registros DNS exatos exibidos pela Vercel no provedor atual do domínio. Preserve MX e TXT de email.
7. Não cancele o Wix antes da migração e de verificar se o domínio depende da conta Wix para registro/DNS.

## Formulário e integrações
O formulário desta versão abre o WhatsApp com os dados preenchidos e exige que o visitante confirme o envio. Não envia email e não usa Wix Forms. Para replicar recebimento por email, será necessário configurar uma integração de envio no servidor e as credenciais privadas na Vercel. Não há Pixel ou GTM novos configurados. Antes da publicação final, revisar as tags existentes, IDs e eventos de conversão.

## Limites da primeira versão
Home não é uma cópia pixel a pixel: estrutura fluida para celular, tipografia de sistema, espaçamentos ajustados e sem animações Wix. Páginas HTML recuperadas podem conter fontes/imagens externas; as imagens da Home foram baixadas. Os números demonstrativos de dashboard da página Performance devem ser identificados como ilustração, não resultados de cliente. Certificações e relação de clientes foram mantidas da página atual: verificar atualidade antes de publicar. Ainda não houve teste visual de navegador da versão nova.

## Editar
Home: public/index.html; estilos: public/style.css; comportamento: public/app.js. Páginas internas têm HTML/CSS original próprio. Os URLs antigos principais foram preservados. Para prévia local: python3 -m http.server 8000 --directory public (use .html para páginas internas na prévia; Vercel aplica cleanUrls).

Atualizações enviadas à branch de produção do GitHub serão publicadas pela integração Vercel.
