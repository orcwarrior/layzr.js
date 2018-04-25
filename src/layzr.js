import knot from 'knot.js'

export default (options = {}) => {
    // private

    let prevLoc = getLoc()
    let ticking

    let nodes
    let windowHeight

    // options

    const settings = {
        bg: options.bg || 'data-bg',
        normal: options.normal || 'data-normal',
        retina: options.retina || 'data-retina',
        srcset: options.srcset || 'data-srcset',
        threshold: options.threshold || 0
    }

    // feature detection
    // https://github.com/Modernizr/Modernizr/blob/master/feature-detects/img/srcset.js

    const srcset = document.body.classList.contains('srcset') || 'srcset' in document.createElement('img')

    // device pixel ratio
    // not supported in IE10 - https://msdn.microsoft.com/en-us/library/dn265030(v=vs.85).aspx

    const dpr = window.devicePixelRatio || window.screen.deviceXDPI / window.screen.logicalXDPI

    // instance

    const instance = knot({
        handlers: handlers,
        check: check,
        update: update
    })

    return instance

    // location helper

    function getLoc() {
        return window.scrollY || window.pageYOffset
    }

    // debounce helpers

    function requestScroll() {
        prevLoc = getLoc()
        requestFrame()
    }

    function requestFrame() {
        if (!ticking) {
            window.requestAnimationFrame(() => check())
            ticking = true
        }
    }

    // offset helper

    function getOffset(node) {
        return node.getBoundingClientRect().top + prevLoc
    }

    // in viewport helper

    function inViewport(node) {
        const viewTop = prevLoc
        const viewBot = viewTop + windowHeight

        const nodeTop = getOffset(node)
        const nodeBot = nodeTop + node.offsetHeight

        const offset = (settings.threshold / 100) * windowHeight

        return (nodeBot >= viewTop - offset) && (nodeTop <= viewBot + offset)
    }

    function pickOptimalResponsive(srcsetStr) {
        const srcset = parseSrcset(srcsetStr);
        return srcset[0].src; // TMP: Pick first srcset

        function parseSrcset(srcsetStr) {
            return srcsetStr.split(', ')
                .map(s => s.split(' '))
                .map(sP => {
                    return {src: sP[0], width: Number(sP[1].replace('w', ''))};
                });
        }
    }

    // source helper
    function setSource(node) {
        const attrSrcset = node.getAttribute(settings.srcset)
        const attrBg = node.getAttribute(settings.bg)

        instance.emit('src:before', node)

        // prefer srcset, fallback to pixel density
        if (srcset && node.hasAttribute(settings.srcset)) {
            node.setAttribute('srcset', node.getAttribute(settings.srcset))
            if (attrBg) {
                const optimalSrc = pickOptimalResponsive(srcset);
                node.style.setProperty('backgroundImage', `url('${optimalSrc}')`)
            }
        } else {
            const normal = node.getAttribute(settings.normal)
            const retina = dpr > 1 && node.getAttribute(settings.retina)
            if (normal)
                node.setAttribute('src', retina || normal)
            if (attrBg) {
                node.style.setProperty('backgroundImage', `url('${retina || bg || normal}')`)
            }
        }

        instance.emit('src:after', node)

        ;[settings.normal, settings.retina, settings.srcset, settings.bg].forEach(attr => node.removeAttribute(attr))

        update()
    }

    // API

    function handlers(flag) {
        const action = flag
            ? 'addEventListener'
            : 'removeEventListener'

        ;['scroll', 'resize'].forEach(event => window[action](event, requestScroll))
        return this
    }

    function check() {
        windowHeight = window.innerHeight

        nodes.forEach(node => inViewport(node) && setSource(node))

        ticking = false
        return this
    }

    function update() {
        nodes = Array.prototype.slice.call(document.querySelectorAll(`[${settings.normal}]`))
        return this
    }
}
