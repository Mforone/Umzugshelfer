<script>
  import { Check, Bell, Paperclip, ListChecks, Flag, Clock, UserRound } from '@lucide/svelte';
  import { oeffne, aufgabeUmschalten, dropDateien, toast, person } from './zustand.svelte.js';
  import { aufgabenKategorie, relativ, tageBis } from './util.js';

  let { aufgabe: a, kompakt = false, ziehbar = false } = $props();
  let ueber = $state(false);

  let kat = $derived(aufgabenKategorie(a.kategorie));
  let t = $derived(a.faellig ? tageBis(a.faellig) : null);
  let ua = $derived(a.unteraufgaben || []);
  let wer = $derived(person(a.verantwortlich));
  let uaFertig = $derived(ua.filter((u) => u.erledigt).length);

  async function drop(ev) {
    ev.preventDefault();
    ueber = false;
    const namen = await dropDateien(ev);
    if (namen.length) {
      a.anhaenge = [...new Set([...(a.anhaenge || []), ...namen])];
      toast(`${namen.length} Datei${namen.length > 1 ? 'en' : ''} an „${a.titel}“ angehängt`);
    }
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions, a11y_click_events_have_key_events -->
<div
  class="eintrag"
  class:erledigt={a.erledigt}
  class:drop-aktiv={ueber}
  class:kompakt
  draggable={ziehbar}
  ondragstart={(e) => { e.dataTransfer.setData('text/aufgabe', a.id); e.dataTransfer.effectAllowed = 'move'; }}
  ondragover={(e) => { if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); ueber = true; } }}
  ondragleave={() => (ueber = false)}
  ondrop={drop}
  onclick={() => oeffne('aufgabe', a.id)}
>
  <button
    class="haken"
    class:an={a.erledigt}
    title={a.erledigt ? 'Als offen markieren' : 'Erledigt'}
    onclick={(e) => { e.stopPropagation(); aufgabeUmschalten(a); }}
  ><Check size={13} strokeWidth={3} /></button>
  <div class="wachsen">
    <div class="eintrag-titel">{a.titel || 'Ohne Titel'}</div>
    {#if !kompakt || a.faellig || wer}
      <div class="eintrag-meta">
        {#if a.faellig}
          <span class="chip" class:rot={!a.erledigt && t < 0} class:gelb={!a.erledigt && t === 0}>
            <Clock size={11} />{relativ(a.faellig)}{a.uhrzeit ? ', ' + a.uhrzeit : ''}
          </span>
        {/if}
        {#if !kompakt}
          <span class="chip farbig" style="--c:{kat.farbe}">{kat.name}</span>
        {/if}
        {#if wer}
          <span class="chip person" title="Zuständig: {wer.name}"><UserRound size={11} />{wer.name}</span>
        {/if}
        {#if ua.length}
          <span class="chip"><ListChecks size={11} />{uaFertig}/{ua.length}</span>
        {/if}
        {#if a.anhaenge?.length}
          <span class="chip"><Paperclip size={11} />{a.anhaenge.length}</span>
        {/if}
        {#if a.erinnerung && !a.erledigt}
          <span class="chip" title="Erinnerung gesetzt"><Bell size={11} /></span>
        {/if}
      </div>
    {/if}
  </div>
  {#if a.prioritaet === 'hoch' && !a.erledigt}
    <span title="Hohe Priorität" style="color:var(--rot)"><Flag size={15} /></span>
  {/if}
</div>

<style>
  .kompakt { padding: 9px 12px; }
  .person { background: color-mix(in srgb, var(--akzent) 16%, transparent); color: var(--text); }
</style>
