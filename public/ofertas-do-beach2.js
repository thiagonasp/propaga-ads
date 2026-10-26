(function(){
  const screens=[...document.querySelectorAll('.screen')];
  const answerButtons=[...document.querySelectorAll('.answers button')];
  const backButton=document.querySelector('.back-button');
  const stepLabel=document.querySelector('.step-label');
  const progress=document.querySelector('.progress i');
  const whatsappButton=document.querySelector('.whatsapp-button');
  const answers={};
  let current=0;
  let started=false;
  let completed=false;

  window.dataLayer=window.dataLayer||[];

  function attribution(){
    const params=new URLSearchParams(window.location.search);
    return {
      page_name:'ofertas_do_beach_quiz',
      page_path:window.location.pathname,
      group_name:'Ofertas do Beach',
      utm_source:params.get('utm_source')||undefined,
      utm_medium:params.get('utm_medium')||undefined,
      utm_campaign:params.get('utm_campaign')||undefined,
      utm_content:params.get('utm_content')||undefined,
      utm_term:params.get('utm_term')||undefined
    };
  }

  function track(event,extra){
    window.dataLayer.push(Object.assign({event:event},attribution(),extra||{}));
  }

  function show(index){
    current=index;
    screens.forEach((screen,i)=>screen.classList.toggle('active',i===index));
    backButton.classList.toggle('visible',index>0&&index<3);
    if(index<3){
      stepLabel.textContent='Pergunta '+(index+1)+' de 3';
      progress.style.width=((index+1)/3*100)+'%';
    }else{
      stepLabel.textContent='Perfil concluído';
      progress.style.width='100%';
      if(!completed){
        completed=true;
        track('quiz_complete',{quiz_name:'ofertas_do_beach',quiz_answers:JSON.stringify(answers)});
        if(typeof window.fbq==='function') window.fbq('trackCustom','QuizComplete',{content_name:'Ofertas do Beach'});
      }
    }
    window.scrollTo({top:0,behavior:'smooth'});
  }

  answerButtons.forEach(button=>button.addEventListener('click',()=>{
    const screen=button.closest('.screen');
    const question=screen.dataset.question;
    const label=button.querySelector('strong').textContent.trim();
    answers[question]=button.dataset.value;
    screen.querySelectorAll('.answers button').forEach(item=>item.classList.remove('selected'));
    button.classList.add('selected');
    if(!started){started=true;track('quiz_start',{quiz_name:'ofertas_do_beach'});}
    track('quiz_answer',{quiz_name:'ofertas_do_beach',quiz_step:current+1,question_id:question,answer_value:button.dataset.value,answer_label:label});
    window.setTimeout(()=>show(current+1),180);
  }));

  backButton.addEventListener('click',()=>{if(current>0)show(current-1);});

  whatsappButton.addEventListener('click',event=>{
    event.preventDefault();
    const data={event_category:'group_entry',event_label:'whatsapp',group_channel:'whatsapp',cta_position:'quiz_result',link_url:whatsappButton.href,quiz_answers:JSON.stringify(answers)};
    track('whatsapp_group_open',data);
    track('whatsapp_group_click',data);
    if(typeof window.fbq==='function') window.fbq('trackCustom','WhatsAppGroupClick',{content_name:'Ofertas do Beach',source:'quiz_result'});
    window.setTimeout(()=>window.location.assign(whatsappButton.href),180);
  });

  track('landing_page_view',{landing_variant:'quiz'});
  track('quiz_landing_view',{quiz_name:'ofertas_do_beach'});
  show(0);
})();
