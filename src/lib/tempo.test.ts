import { describe, expect, it } from 'vitest';
import { horaRelativa } from './tempo.ts';

const AGORA = Date.parse('2026-11-10T13:00:00.000Z');
const antes = (seg: number) => new Date(AGORA - seg * 1000).toISOString();

describe('hora relativa', () => {
	it('em português e em inglês', () => {
		expect(horaRelativa(antes(20), AGORA, 'pt-BR')).toBe('agora');
		expect(horaRelativa(antes(120), AGORA, 'pt-BR')).toBe('há 2 minutos');
		expect(horaRelativa(antes(3_700), AGORA, 'pt-BR')).toBe('há 1 hora');
		expect(horaRelativa(antes(2 * 86_400), AGORA, 'pt-BR')).toBe('anteontem');
		expect(horaRelativa(antes(120), AGORA, 'en-GB')).toBe('2 minutes ago');
	});
});
