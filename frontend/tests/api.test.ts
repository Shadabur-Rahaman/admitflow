// @vitest-environment jsdom
import {afterEach, expect, test, vi} from 'vitest'
import {api, ApiError} from '../src/api'

afterEach(() => vi.unstubAllGlobals())

test('reports a hosting interstitial as a service error', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>Waking up</html>')))
  await expect(api('/patients')).rejects.toThrow('unexpected response')
})

test('keeps structured validation errors available to forms', async () => {
  const detail = [{loc: ['body', 'name'], msg: 'Enter a name.'}]
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({detail}, {status: 422})))
  await expect(api('/patients')).rejects.toMatchObject({detail})
})

test('reports a failed connection through the API error contract', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
  await expect(api('/patients')).rejects.toBeInstanceOf(ApiError)
})
