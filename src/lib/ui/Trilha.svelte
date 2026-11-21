<script lang="ts">
	import { t } from '#lib/i18n.svelte.ts';
	import type { Elo } from '#lib/trilha.ts';

	// No notebook, a trilha inteira; no celular, só o nível de cima, com "‹" (passo 25).
	let { elos }: { elos: Elo[] } = $props();
</script>

<nav class="trilha" aria-label={t('Trilha')}>
	<ol>
		{#each elos as elo (elo.href)}
			<li><a href={elo.href}><span class="trilha-voltar" aria-hidden="true">‹ </span>{elo.rotulo}</a></li>
		{/each}
	</ol>
</nav>
