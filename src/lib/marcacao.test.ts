import { describe, expect, it } from 'vitest';
import { marcacaoParaHtml } from './marcacao.ts';

describe('marcacaoParaHtml', () => {
	it('títulos, listas, negrito e parágrafos', () => {
		expect(marcacaoParaHtml('# Roteiro\n\nManhã **cedo**\nsegunda linha\n\n- um\n- dois\n1. a\n2. b')).toBe(
			'<h2>Roteiro</h2><p>Manhã <strong>cedo</strong><br>segunda linha</p><ul><li>um</li><li>dois</li></ul><ol><li>a</li><li>b</li></ol>'
		);
	});
	it('escapa HTML e só liga links http(s)', () => {
		expect(marcacaoParaHtml('<script>alert(1)</script> <img src=x onerror="y">')).toBe(
			'<p>&lt;script&gt;alert(1)&lt;/script&gt; &lt;img src=x onerror=&quot;y&quot;&gt;</p>'
		);
		expect(marcacaoParaHtml('[guia](https://exemplo.test/g) [mau](javascript:alert(1))')).toBe(
			'<p><a href="https://exemplo.test/g" target="_blank" rel="noopener noreferrer">guia</a> [mau](javascript:alert(1))</p>'
		);
		expect(marcacaoParaHtml('[x](https://a.test/"onclick="y)')).not.toContain('"onclick');
	});
});
