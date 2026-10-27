/**
 * node scripts/check-sticky-prompt.mjs
 * 粘性提问：稀疏 turnRefs（显示更早裁切）+ 开合迟滞纯逻辑。
 */
import {
  findActiveTurnIndex,
  isUserBubbleScrolledAway,
  STICKY_SHOW_GAP,
  STICKY_HIDE_GAP,
} from '../shared/sticky-prompt.mjs'

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg)
    process.exitCode = 1
  } else {
    console.log('ok:', msg)
  }
}

function fakeEl(top, bottom = top + 40) {
  return {
    getBoundingClientRect: () => ({
      top,
      bottom,
      left: 0,
      right: 100,
      width: 100,
      height: bottom - top,
    }),
  }
}

const root = {
  getBoundingClientRect: () => ({
    top: 100,
    bottom: 500,
    left: 0,
    right: 400,
    width: 400,
    height: 400,
  }),
}

const sparse = [null, null, null, fakeEl(90), fakeEl(200), fakeEl(280)]
assert(findActiveTurnIndex(root, sparse) === 3, 'sparse refs: first mounted is active')
assert(findActiveTurnIndex(root, sparse) !== 0, 'sparse refs: never default to index 0')

const above = [null, null, fakeEl(200), fakeEl(300)]
const rootLow = {
  getBoundingClientRect: () => ({
    top: 50,
    bottom: 450,
    left: 0,
    right: 400,
    width: 400,
    height: 400,
  }),
}
assert(findActiveTurnIndex(rootLow, above) === -1, 'above first mounted → -1')

const deep = [null, null, fakeEl(80), fakeEl(150), fakeEl(220)]
const rootDeep = {
  getBoundingClientRect: () => ({
    top: 100,
    bottom: 500,
    left: 0,
    right: 400,
    width: 400,
    height: 400,
  }),
}
assert(findActiveTurnIndex(rootDeep, deep) === 2, 'picks last mounted turn at/above anchor')

assert(isUserBubbleScrolledAway(rootDeep, fakeEl(40, 50), false) === true, 'show sticky when bubble above')
assert(isUserBubbleScrolledAway(rootDeep, fakeEl(130, 170), false) === false, 'hide sticky when bubble in view')
assert(STICKY_HIDE_GAP > STICKY_SHOW_GAP, 'hysteresis gaps')

if (!process.exitCode) console.log('check-sticky-prompt: PASSED')
