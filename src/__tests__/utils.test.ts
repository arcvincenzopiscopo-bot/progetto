import { validatePoi } from '../utils/validatePoi';

describe('validatePoi', () => {
  it('should return null for POI without coordinates', () => {
    const invalidPoi = {
      id: '1',
      indirizzo: 'Test Address',
      username: 'testuser',
      team: 'testteam',
      ispezionabile: 1,
      tipo: 'cantiere',
      latitudine: null,
      longitudine: null
    };

    expect(validatePoi(invalidPoi)).toBeNull();
  });

  it('should return null for POI with invalid coordinates', () => {
    const invalidPoi = {
      id: '1',
      indirizzo: 'Test Address',
      username: 'testuser',
      team: 'testteam',
      ispezionabile: 1,
      tipo: 'cantiere',
      latitudine: 'invalid',
      longitudine: 'invalid'
    };

    expect(validatePoi(invalidPoi)).toBeNull();
  });

  it('should validate and convert string coordinates to numbers', () => {
    const poi = {
      id: '1',
      indirizzo: 'Test Address',
      username: 'testuser',
      team: 'testteam',
      ispezionabile: 1,
      tipo: 'cantiere',
      latitudine: '41.9028',
      longitudine: '12.4964'
    };

    const result = validatePoi(poi);

    expect(result).not.toBeNull();
    expect(result?.latitudine).toBe(41.9028);
    expect(result?.longitudine).toBe(12.4964);
  });

  it('should accept valid number coordinates', () => {
    const poi = {
      id: '1',
      indirizzo: 'Test Address',
      username: 'testuser',
      team: 'testteam',
      ispezionabile: 1,
      tipo: 'cantiere',
      latitudine: 41.9028,
      longitudine: 12.4964
    };

    const result = validatePoi(poi);

    expect(result).not.toBeNull();
    expect(result?.latitudine).toBe(41.9028);
    expect(result?.longitudine).toBe(12.4964);
  });
});
