import Vue from 'vue'

import QBtn from '../btn/QBtn.js'
import DateTimeMixin from './datetime-mixin.js'

import { formatDate, __splitDate } from '../../utils/date.js'
import { pad } from '../../utils/format.js'
import { jalaaliMonthLength, toGregorian } from '../../utils/date-persian.js'

const yearsInterval = 20
const viewIsValid = v => ['Calendar', 'Years', 'Months'].includes(v)

const KEYCODE_TAB = 9
const KEYCODE_ENTER = 13
const KEYCODE_PGUP = 33
const KEYCODE_PGDN = 34
const KEYCODE_HOME = 36
const KEYCODE_END = 35
const KEYCODE_DOWN = 40
const KEYCODE_LEFT = 37
const KEYCODE_RIGHT = 39
const KEYCODE_UP = 38

export default Vue.extend({
  name: 'QDate',

  mixins: [ DateTimeMixin ],

  props: {
    title: String,
    subtitle: String,

    emitImmediately: Boolean,

    mask: {
      // this mask is forced
      // when using persian calendar
      default: 'YYYY/MM/DD'
    },

    defaultYearMonth: {
      type: String,
      validator: v => /^-?[\d]+\/[0-1]\d$/.test(v)
    },

    events: [Array, Function],
    eventColor: [String, Function],

    options: [Array, Function],

    firstDayOfWeek: [String, Number],
    todayBtn: Boolean,
    minimal: Boolean,
    closeBtn: Boolean,
    defaultView: {
      type: String,
      default: 'Calendar',
      validator: viewIsValid
    }
  },

  data () {
    const { inner, external } = this.__getModels(this.value, this.mask, this.__getComputedLocale())
    return {
      view: this.defaultView,
      monthDirection: 'left',
      yearDirection: 'left',
      startYear: inner.year - inner.year % yearsInterval,
      innerModel: inner,
      extModel: external
    }
  },

  watch: {
    value (v) {
      const { inner, external } = this.__getModels(v, this.mask, this.__getComputedLocale())

      if (
        this.extModel.dateHash !== external.dateHash ||
        this.extModel.timeHash !== external.timeHash
      ) {
        this.extModel = external
      }

      if (inner.dateHash !== this.innerModel.dateHash) {
        this.monthDirection = this.innerModel.dateHash < inner.dateHash ? 'left' : 'right'
        if (inner.year !== this.innerModel.year) {
          this.yearDirection = this.monthDirection
        }

        this.$nextTick(() => {
          this.startYear = inner.year - inner.year % yearsInterval
          this.innerModel = inner
        })
      }
    },

    view () {
      this.$refs.blurTarget !== void 0 && this.$refs.blurTarget.focus()
    }
  },

  computed: {
    classes () {
      const type = this.landscape === true ? 'landscape' : 'portrait'
      return `q-date--${type} q-date--${type}-${this.minimal === true ? 'minimal' : 'standard'}` +
        (this.dark === true ? ' q-date--dark' : '') +
        (this.bordered === true ? ` q-date--bordered` : '') +
        (this.square === true ? ` q-date--square no-border-radius` : '') +
        (this.flat === true ? ` q-date--flat no-shadow` : '') +
        (this.readonly === true && this.disable !== true ? ' q-date--readonly' : '') +
        (this.disable === true ? ' disabled' : '')
    },

    headerTitle () {
      if (this.title !== void 0 && this.title !== null && this.title.length > 0) {
        return this.title
      }

      const model = this.extModel
      if (model.dateHash === null) { return ' --- ' }

      let date

      if (this.calendar !== 'persian') {
        date = new Date(model.year, model.month - 1, model.day)
      }
      else {
        const gDate = toGregorian(model.year, model.month, model.day)
        date = new Date(gDate.gy, gDate.gm - 1, gDate.gd)
      }

      if (isNaN(date.valueOf()) === true) { return ' --- ' }

      if (this.computedLocale.headerTitle !== void 0) {
        return this.computedLocale.headerTitle(date, model)
      }

      return this.computedLocale.daysShort[ date.getDay() ] + ', ' +
        this.computedLocale.monthsShort[ model.month - 1 ] + ' ' +
        model.day
    },

    headerSubtitle () {
      return this.subtitle !== void 0 && this.subtitle !== null && this.subtitle.length > 0
        ? this.subtitle
        : (
          this.extModel.year !== null
            ? this.extModel.year
            : ' --- '
        )
    },

    dateArrow () {
      const val = [ this.$q.iconSet.datetime.arrowLeft, this.$q.iconSet.datetime.arrowRight ]
      return this.$q.lang.rtl ? val.reverse() : val
    },

    computedFirstDayOfWeek () {
      return this.firstDayOfWeek !== void 0
        ? Number(this.firstDayOfWeek)
        : this.computedLocale.firstDayOfWeek
    },

    daysOfWeek () {
      const
        days = this.computedLocale.daysShort,
        first = this.computedFirstDayOfWeek

      return first > 0
        ? days.slice(first, 7).concat(days.slice(0, first))
        : days
    },

    daysInMonth () {
      return this.__getDaysInMonth(this.innerModel)
    },

    today () {
      return this.__getCurrentDate()
    },

    evtFn () {
      return typeof this.events === 'function'
        ? this.events
        : date => this.events.includes(date)
    },

    evtColor () {
      return typeof this.eventColor === 'function'
        ? this.eventColor
        : date => this.eventColor
    },

    isInSelection () {
      return typeof this.options === 'function'
        ? this.options
        : date => this.options.includes(date)
    },

    days () {
      let date, endDay

      const res = []

      if (this.calendar !== 'persian') {
        date = new Date(this.innerModel.year, this.innerModel.month - 1, 1)
        endDay = (new Date(this.innerModel.year, this.innerModel.month - 1, 0)).getDate()
      }
      else {
        const gDate = toGregorian(this.innerModel.year, this.innerModel.month, 1)
        date = new Date(gDate.gy, gDate.gm - 1, gDate.gd)
        let prevJM = this.innerModel.month - 1
        let prevJY = this.innerModel.year
        if (prevJM === 0) {
          prevJM = 12
          prevJY--
        }
        endDay = jalaaliMonthLength(prevJY, prevJM)
      }

      const days = (date.getDay() - this.computedFirstDayOfWeek - 1)

      const len = days < 0 ? days + 7 : days
      if (len < 6) {
        for (let i = endDay - len; i <= endDay; i++) {
          res.push({ i, fill: true })
        }
      }

      const
        index = res.length,
        prefix = this.innerModel.year + '/' + pad(this.innerModel.month) + '/'

      for (let i = 1; i <= this.daysInMonth; i++) {
        const day = prefix + pad(i)

        if (this.options !== void 0 && this.isInSelection(day) !== true) {
          res.push({ i })
        }
        else {
          const event = this.events !== void 0 && this.evtFn(day) === true
            ? this.evtColor(day)
            : false

          res.push({ i, in: true, flat: true, event })
        }
      }

      if (this.innerModel.year === this.extModel.year && this.innerModel.month === this.extModel.month) {
        const i = index + this.innerModel.day - 1
        res[i] !== void 0 && Object.assign(res[i], {
          unelevated: true,
          flat: false,
          color: this.computedColor,
          textColor: this.computedTextColor
        })
      }

      if (this.innerModel.year === this.today.year && this.innerModel.month === this.today.month) {
        res[index + this.today.day - 1].today = true
      }

      const left = res.length % 7
      if (left > 0) {
        const afterDays = 7 - left
        for (let i = 1; i <= afterDays; i++) {
          res.push({ i, fill: true })
        }
      }

      return res
    }
  },

  methods: {
    setToday () {
      this.__updateValue({ ...this.today }, 'today')
      this.view = 'Calendar'
    },

    setView (view) {
      if (viewIsValid(view) === true) {
        this.view = view
      }
    },

    offsetCalendar (type, descending) {
      if (['month', 'year'].includes(type)) {
        this[`__goTo${type === 'month' ? 'Month' : 'Year'}`](
          descending === true ? -1 : 1
        )
      }
    },

    __getDateAt (day) {
      if (this.title !== void 0 && this.title !== null && this.title.length > 0) {
        return this.title
      }

      const model = this.extModel
      if (model.dateHash === null) { return ' --- ' }

      let date

      if (this.calendar !== 'persian') {
        date = new Date(model.year, model.month - 1, day)
      }
      else {
        const gDate = toGregorian(model.year, model.month, day)
        date = new Date(gDate.gy, gDate.gm - 1, gDate.gd)
      }

      if (isNaN(date.valueOf()) === true) { return ' --- ' }

      if (this.computedLocale.headerTitle !== void 0) {
        return this.computedLocale.headerTitle(date, model)
      }

      return this.computedLocale.daysShort[ date.getDay() ] + ', ' +
        this.computedLocale.monthsShort[ model.month - 1 ] + ' ' +
        day + ' ' + model.year
    },

    __getPreviousMonth (label) {
      let year = this.innerModel.year
      let index = this.computedLocale.months.indexOf(label) - 1
      if (index < 0) {
        index = 11
        year--
      }
      return this.computedLocale.months[index] + ' ' + year
    },

    __getNextMonth (label) {
      let year = this.innerModel.year
      let index = this.computedLocale.months.indexOf(label) + 1
      if (index > 11) {
        index = 0
        year++
      }
      return this.computedLocale.months[index] + ' ' + year
    },

    __getFirstElement () {
      if (this.view === 'Calendar') {
        return this.$refs.MonthsBack.$el
      }
      else if (this.view === 'Months') {
        return this.$refs.month1.$el
      }
      else if (this.view === 'Years') {
        return this.$refs.mainYearsBack.$el
      }
    },

    __getLastElement () {
      if (this.view === 'Calendar') {
        let day
        for (day = this.daysInMonth; day > 0; day--) {
          if (this.$refs['day' + day]) {
            return this.$refs['day' + day].$el
          }
        }
        return this.$refs.YearsNext.$el.focus()
      }
      else if (this.view === 'Months') {
        return this.$refs.month12.$el
      }
      else if (this.view === 'Years') {
        return this.$refs.mainYearsNext.$el
      }
    },

    __focusFirstButtonInNav () {
      if (this.view === 'Calendar') {
        this.$refs.MonthsBack.$el.focus()
      }
      else {
        this.focusFirstElementInMain()
      }
    },

    __focusLastButtonInNav () {
      if (this.view === 'Calendar') {
        this.$refs.YearsNext.$el.focus()
      }
      else {
        this.focusFirstElementInMain()
      }
    },

    __focusFirstElementInMain () {
      if (this.view === 'Calendar') {
        this.$refs.day1.$el.focus()
      }
      else if (this.view === 'Months') {
        this.$refs.month1.$el.focus()
      }
      else if (this.view === 'Years') {
        this.$refs.mainYearsBack.$el.focus()
      }
    },

    __focusLastDayInPrevMonth () {
      if (this.innerModel.month === 1) {
        this.__setYear(this.innerModel.year - 1)
      }
      this.__setMonth((this.innerModel.month - 1))
      this.__setDay(this.daysInMonth)
    },

    __focusFirstDayInNextMonth () {
      if (this.innerModel.month === 12) {
        this.__setYear(this.innerModel.year + 1)
      }
      this.__setMonth((this.innerModel.month + 1))
      this.__setDay(1)
    },

    __focusPrevMonth (day) {
      if (this.innerModel.month === 1) {
        this.__setYear(this.innerModel.year - 1)
      }
      this.__setMonth((this.innerModel.month - 1))
      if (day > this.daysInMonth) {
        day = this.daysInMonth
      }
      this.__setDay(day)
    },

    __focusNextMonth (day) {
      if (this.innerModel.month === 12) {
        this.__setYear(this.innerModel.year + 1)
      }
      this.__setMonth((this.innerModel.month + 1))
      if (day > this.daysInMonth) {
        day = this.daysInMonth
      }
      this.__setDay(day)
    },

    __focusCurr () {
      if (this.view === 'Months') {
        let currMonth = this.innerModel.month
        this.$refs['month' + currMonth].$el.focus()
      }
      else if (this.view === 'Years') {
        let currYear = this.innerModel.year
        if (currYear >= this.startYear && currYear <= this.startYear + yearsInterval) {
          this.$refs['year' + currYear].$el.focus()
        }
      }
      else {
        let day = this.innerModel.day
        if (this.$refs['day' + day]) {
          this.$refs['day' + day].$el.focus()
        }
      }
    },

    __getModels (val, mask, locale) {
      const external = __splitDate(
        val,
        this.calendar === 'persian' ? 'YYYY/MM/DD' : mask,
        locale,
        this.calendar
      )

      return {
        external,
        inner: external.dateHash === null
          ? this.__getDefaultModel()
          : { ...external }
      }
    },

    __getDefaultModel () {
      let year, month

      if (this.defaultYearMonth !== void 0) {
        const d = this.defaultYearMonth.split('/')
        year = parseInt(d[0], 10)
        month = parseInt(d[1], 10)
      }
      else {
        // may come from data() where computed
        // props are not yet available
        const d = this.today !== void 0
          ? this.today
          : this.__getCurrentDate()

        year = d.year
        month = d.month
      }

      return {
        year,
        month,
        day: 1,
        hour: 0,
        minute: 0,
        second: 0,
        millisecond: 0,
        dateHash: year + '/' + pad(month) + '/01'
      }
    },

    __getHeader (h) {
      if (this.minimal === true) { return }

      return h('div', {
        staticClass: 'row q-date__header-bkg',
        class: this.headerClass,
        attrs: { role: 'region', 'aria-label': 'Calendar header' }
      }, [
        this.closeBtn === true ? h('div', {
          staticClass: 'col-shrink'
        }, [
          h(QBtn, {
            staticClass: 'q-date__header-close',
            attrs: { 'aria-label': 'close pop up calendar' },
            props: {
              icon: this.$q.iconSet.datetime.close,
              flat: true,
              size: 'md',
              dense: true,
              round: true,
              tabindex: this.computedTabindex
            },
            directives: [{
              name: 'close-popup',
              value: true
            }]
          })
        ]) : null,

        h('div', {
          staticClass: 'col q-date__header'
        }, [
          h('div', {
            staticClass: 'relative-position'
          }, [
            h('transition', {
              props: {
                name: 'q-transition--fade'
              }
            }, [
              h('div', {
                key: 'h-yr-' + this.headerSubtitle,
                staticClass: 'q-date__header-subtitle q-date__header-link focus-only',
                class: this.view === 'Years' ? 'q-date__header-link--active' : 'cursor-pointer',
                attrs: { tabindex: this.computedTabindex, role: 'button' },
                on: {
                  click: () => { this.view = 'Years' }
                }
              }, [ this.headerSubtitle ])
            ])
          ]),

          h('div', {
            staticClass: 'q-date__header-title relative-position flex no-wrap'
          }, [
            h('div', {
              staticClass: 'relative-position col'
            }, [
              h('transition', {
                props: {
                  name: 'q-transition--fade'
                }
              }, [
                h('div', {
                  key: 'h-sub' + this.headerTitle,
                  staticClass: 'q-date__header-title-label q-date__header-link focus-only',
                  class: this.view === 'Calendar' ? 'q-date__header-link--active' : 'cursor-pointer',
                  attrs: { tabindex: this.computedTabindex, role: 'button' },
                  on: {
                    click: () => { this.view = 'Calendar' }
                  }
                }, [ this.headerTitle ])
              ])
            ]),

            this.todayBtn === true ? h(QBtn, {
              staticClass: 'q-date__header-today',
              attrs: { 'aria-label': 'select today\'s date' },
              props: {
                icon: this.$q.iconSet.datetime.today,
                flat: true,
                size: 'sm',
                round: true,
                tabindex: this.computedTabindex
              },
              on: {
                click: this.setToday
              }
            }) : null
          ])
        ])
      ])
    },

    __getNavigation (h, { label, view, key, dir, goTo, cls }) {
      return [
        h('div', {
          staticClass: 'row items-center q-date__arrow'
        }, [
          h(QBtn, {
            ref: view + 'Back',
            attrs: { 'aria-label': view === 'Months' ? 'Previous month ' + this.__getPreviousMonth(label) : 'Previous year ' + (label - 1) },
            props: {
              round: true,
              dense: true,
              size: 'sm',
              flat: true,
              icon: this.dateArrow[0],
              tabindex: this.computedTabindex
            },
            on: {
              click () { goTo(-1) },
              keydown: e => { e.preventDefault() },
              keyup: e => {
                switch (e.keyCode) {
                  case KEYCODE_ENTER:
                    this.$refs[view + 'Back'].$el.focus()
                    break
                  case KEYCODE_LEFT:
                    if (view === 'Years') {
                      this.$refs['MonthsNext'].$el.focus()
                    }
                    else {
                      this.$refs['YearsNext'].$el.focus()
                    }
                    break
                  case KEYCODE_RIGHT:
                    this.$refs[view + 'Nav'].$el.focus()
                    break
                  case KEYCODE_DOWN:
                    this.__focusFirstElementInMain()
                    break
                }
              }
            }
          })
        ]),

        h('div', {
          staticClass: 'relative-position overflow-hidden flex flex-center' + cls
        }, [
          h('transition', {
            props: {
              name: 'q-transition--jump-' + dir
            }
          }, [
            h('div', { key }, [
              h(QBtn, {
                ref: view + 'Nav',
                props: {
                  flat: true,
                  dense: true,
                  noCaps: true,
                  label,
                  tabindex: this.computedTabindex
                },
                on: {
                  click: () => { this.view = view },
                  keydown: e => { e.preventDefault() },
                  keyup: e => {
                    switch (e.keyCode) {
                      case KEYCODE_ENTER:
                        this.view = view
                        break
                      case KEYCODE_LEFT:
                        this.$refs[view + 'Back'].$el.focus()
                        break
                      case KEYCODE_RIGHT:
                        this.$refs[view + 'Next'].$el.focus()
                        break
                      case KEYCODE_DOWN:
                        this.__focusFirstElementInMain()
                        break
                    }
                  }
                }
              })
            ])
          ])
        ]),

        h('div', {
          staticClass: 'row items-center q-date__arrow'
        }, [
          h(QBtn, {
            ref: view + 'Next',
            attrs: { 'aria-label': view === 'Months' ? 'Next month ' + this.__getNextMonth(label) : 'Next year ' + (label + 1) },
            props: {
              round: true,
              dense: true,
              size: 'sm',
              flat: true,
              icon: this.dateArrow[1],
              tabindex: this.computedTabindex
            },
            on: {
              click () { goTo(1) },
              keydown: e => { e.preventDefault() },
              keyup: e => {
                switch (e.keyCode) {
                  case KEYCODE_LEFT:
                    this.$refs[view + 'Nav'].$el.focus()
                    break
                  case KEYCODE_RIGHT:
                    if (view === 'Months') {
                      this.$refs['YearsBack'].$el.focus()
                    }
                    else {
                      this.$refs['MonthsBack'].$el.focus()
                    }
                    break
                  case KEYCODE_DOWN:
                    this.__focusFirstElementInMain()
                    break
                }
              }
            }
          })
        ])
      ]
    },

    __getCalendarView (h) {
      return [
        h('div', {
          key: 'calendar-view',
          staticClass: 'q-date__view q-date__calendar',
          attrs: { role: 'region', 'aria-label': 'calendar dates' }
        }, [
          h('div', {
            staticClass: 'q-date__navigation row items-center no-wrap',
            attrs: { role: 'navigation', 'aria-label': 'Calendar' }
          }, this.__getNavigation(h, {
            label: this.computedLocale.months[ this.innerModel.month - 1 ],
            view: 'Months',
            key: this.innerModel.month,
            dir: this.monthDirection,
            goTo: this.__goToMonth,
            cls: ' col'
          }).concat(this.__getNavigation(h, {
            label: this.innerModel.year,
            view: 'Years',
            key: this.innerModel.year,
            dir: this.yearDirection,
            goTo: this.__goToYear,
            cls: ''
          }))),

          h('div', {
            staticClass: 'q-date__calendar-weekdays row items-center no-wrap'
          }, this.daysOfWeek.map(day => h('div', { staticClass: 'q-date__calendar-item' }, [ h('div', [ day ]) ]))),

          h('div', {
            staticClass: 'q-date__calendar-days-container relative-position overflow-hidden'
          }, [
            h('transition', {
              props: {
                name: 'q-transition--slide-' + this.monthDirection
              }
            }, [
              h('div', {
                key: this.innerModel.year + '/' + this.innerModel.month,
                staticClass: 'q-date__calendar-days fit'
              }, this.days.map(day => h('div', {
                staticClass: `q-date__calendar-item q-date__calendar-item--${day.fill === true ? 'fill' : (day.in === true ? 'in' : 'out')}`
              }, [
                day.in === true
                  ? h(QBtn, {
                    staticClass: day.today === true ? 'q-date__today' : null,
                    ref: 'day' + day.i,
                    attrs: { 'aria-label': this.__getDateAt(day.i), 'aria-selected': day.unelevated },
                    props: {
                      dense: true,
                      flat: day.flat,
                      unelevated: day.unelevated,
                      color: day.color,
                      textColor: day.textColor,
                      label: day.i,
                      tabindex: this.computedTabindex
                    },
                    on: {
                      click: () => { this.__setDay(day.i) },
                      keydown: e => { e.preventDefault() },
                      keyup: e => {
                        e.preventDefault()
                        switch (e.keyCode) {
                          case KEYCODE_ENTER:
                            this.__setDay(day.i)
                            break
                          case KEYCODE_PGUP:
                            this.__focusPrevMonth(day.i)
                            break
                          case KEYCODE_PGDN:
                            this.__focusNextMonth(day.i)
                            break
                          case KEYCODE_HOME:
                            this.$refs.day1.$el.focus()
                            break
                          case KEYCODE_END:
                            this.$refs['day' + this.daysInMonth].$el.focus()
                            break
                          case KEYCODE_LEFT:
                            console.log(day)
                            let prev = day.i - 1
                            if (prev > 0) {
                              this.$refs['day' + prev].$el.focus()
                            }
                            else {
                              this.__focusLastDayInPrevMonth()
                            }
                            break
                          case KEYCODE_UP:
                            let prevWeek = day.i - 7
                            if (prevWeek > 0) {
                              this.$refs['day' + prevWeek].$el.focus()
                            }
                            else if (day.i === 1) {
                              this.__focusLastButtonInNav()
                            }
                            else {
                              this.$refs.day1.$el.focus()
                            }
                            break
                          case KEYCODE_RIGHT:
                            let next = day.i + 1
                            if (next <= this.daysInMonth) {
                              this.$refs['day' + next].$el.focus()
                            }
                            else {
                              this.__focusFirstDayInNextMonth()
                            }
                            break
                          case KEYCODE_DOWN:
                            let nextWeek = day.i + 7
                            if (nextWeek <= this.daysInMonth) {
                              this.$refs['day' + nextWeek].$el.focus()
                            }
                            else if (day.i === this.daysInMonth) {
                              this.__focusFirstButtonInNav()
                            }
                            else {
                              this.$refs['day' + this.daysInMonth].$el.focus()
                            }
                            break
                        }
                      }
                    }
                  }, day.event !== false ? [
                    h('div', { staticClass: 'q-date__event bg-' + day.event })
                  ] : null)
                  : h('div', [ day.i ])
              ])))
            ])
          ])
        ])
      ]
    },

    __getMonthsView (h) {
      const currentYear = this.innerModel.year === this.today.year

      const content = this.computedLocale.monthsShort.map((month, i) => {
        const active = this.innerModel.month === i + 1

        return h('div', {
          staticClass: 'q-date__months-item flex flex-center'
        }, [
          h(QBtn, {
            staticClass: currentYear === true && this.today.month === i + 1 ? 'q-date__today' : null,
            ref: 'month' + (i + 1),
            attrs: { 'aria-label': this.computedLocale.months[i], 'aria-selected': active },
            props: {
              flat: !active,
              label: month,
              unelevated: active,
              color: active ? this.computedColor : null,
              textColor: active ? this.computedTextColor : null,
              tabindex: this.computedTabindex
            },
            on: {
              click: () => { this.__setMonth(i + 1) },
              keydown: e => { e.preventDefault() },
              keyup: e => {
                e.preventDefault()
                switch (e.keyCode) {
                  case KEYCODE_HOME:
                    this.$refs.month1.$el.focus()
                    break
                  case KEYCODE_END:
                    this.$refs.month12.$el.focus()
                    break
                  case KEYCODE_LEFT:
                    let lastMonth = i
                    if (lastMonth <= 0) {
                      lastMonth = 12
                    }
                    this.$refs['month' + lastMonth].$el.focus()
                    break
                  case KEYCODE_UP:
                    lastMonth = i - 2
                    if (lastMonth <= 0) {
                      lastMonth = 12 - (2 - i)
                    }
                    this.$refs['month' + lastMonth].$el.focus()
                    break
                  case KEYCODE_RIGHT:
                    let nextMonth = i + 2
                    if (nextMonth > 12) {
                      nextMonth = 1
                    }
                    this.$refs['month' + nextMonth].$el.focus()
                    break
                  case KEYCODE_DOWN:
                    nextMonth = i + 2 + 2
                    if (nextMonth > 12) {
                      nextMonth = i - 8
                    }
                    this.$refs['month' + nextMonth].$el.focus()
                    break
                }
              }
            }
          })
        ])
      })

      return h('div', {
        key: 'months-view',
        staticClass: 'q-date__view q-date__months column flex-center',
        attrs: { role: 'region', 'aria-label': 'select month' }
      }, [
        h('div', { staticClass: 'q-date__months-content row' }, content)
      ])
    },

    __getYearsView (h) {
      const
        start = this.startYear,
        stop = start + yearsInterval,
        years = []

      for (let i = start; i <= stop; i++) {
        const active = this.innerModel.year === i

        years.push(
          h('div', {
            staticClass: 'q-date__years-item flex flex-center'
          }, [
            h(QBtn, {
              staticClass: this.today.year === i ? 'q-date__today' : null,
              class: 'year' + i,
              ref: 'year' + i,
              attrs: { 'aria-selected': active },
              props: {
                flat: !active,
                label: i,
                dense: true,
                unelevated: active,
                color: active ? this.computedColor : null,
                textColor: active ? this.computedTextColor : null,
                tabindex: this.computedTabindex
              },
              on: {
                click: () => { this.__setYear(i) },
                keydown: e => { e.preventDefault() },
                keyup: e => {
                  e.preventDefault()
                  switch (e.keyCode) {
                    case KEYCODE_PGUP:
                      this.startYear -= yearsInterval
                      break
                    case KEYCODE_PGDN:
                      this.startYear += yearsInterval
                      break
                    case KEYCODE_HOME:
                      this.$refs['year' + start].$el.focus()
                      break
                    case KEYCODE_END:
                      this.$refs['year' + stop].$el.focus()
                      break
                    case KEYCODE_LEFT:
                      let lastYear = i - 1
                      if (lastYear >= start) {
                        this.$refs['year' + lastYear].$el.focus()
                      }
                      else {
                        this.$refs.mainYearsBack.$el.focus()
                      }
                      break
                    case KEYCODE_UP:
                      lastYear = i - 3
                      if (lastYear < start) {
                        lastYear += yearsInterval + 1
                      }
                      this.$refs['year' + lastYear].$el.focus()
                      break
                    case KEYCODE_RIGHT:
                      let nextYear = i + 1
                      if (nextYear <= stop) {
                        this.$refs['year' + nextYear].$el.focus()
                      }
                      else {
                        this.$refs.mainYearsNext.$el.focus()
                      }
                      break
                    case KEYCODE_DOWN:
                      nextYear = i + 3
                      if (nextYear > stop) {
                        nextYear -= yearsInterval + 1
                      }
                      this.$refs['year' + nextYear].$el.focus()
                      break
                  }
                }
              }
            })
          ])
        )
      }

      return h('div', {
        staticClass: 'q-date__view q-date__years flex flex-center full-height',
        attrs: { role: 'region', 'aria-label': 'select year' }
      }, [
        h('div', {
          staticClass: 'col-auto'
        }, [
          h(QBtn, {
            ref: 'mainYearsBack',
            attrs: { 'aria-label': 'Years ' + (start - yearsInterval) + ' to ' + start },
            props: {
              round: true,
              dense: true,
              flat: true,
              icon: this.dateArrow[0],
              tabindex: this.computedTabindex
            },
            on: {
              click: () => { this.startYear -= yearsInterval },
              keydown: e => { e.preventDefault() },
              keyup: e => {
                e.preventDefault()
                switch (e.keyCode) {
                  case KEYCODE_LEFT:
                  case KEYCODE_UP:
                    this.$refs.mainYearsNext.$el.focus()
                    break
                  case KEYCODE_RIGHT:
                  case KEYCODE_DOWN:
                    this.$refs['year' + this.startYear].$el.focus()
                    break
                }
              }
            }
          })
        ]),

        h('div', {
          staticClass: 'q-date__years-content col full-height row items-center'
        }, years),

        h('div', {
          staticClass: 'col-auto'
        }, [
          h(QBtn, {
            ref: 'mainYearsNext',
            attrs: { 'aria-label': 'Years ' + stop + ' to ' + (stop + yearsInterval) },
            props: {
              round: true,
              dense: true,
              flat: true,
              icon: this.dateArrow[1],
              tabindex: this.computedTabindex
            },
            on: {
              click: () => { this.startYear += yearsInterval },
              keydown: e => { e.preventDefault() },
              keyup: e => {
                e.preventDefault()
                switch (e.keyCode) {
                  case KEYCODE_LEFT:
                  case KEYCODE_UP:
                    this.$refs['year' + (this.startYear + yearsInterval)].$el.focus()
                    break
                  case KEYCODE_RIGHT:
                  case KEYCODE_DOWN:
                    this.$refs.mainYearsBack.$el.focus()
                    break
                }
              }
            }
          })
        ])
      ])
    },

    __getDaysInMonth (obj) {
      return this.calendar !== 'persian'
        ? (new Date(obj.year, obj.month, 0)).getDate()
        : jalaaliMonthLength(obj.year, obj.month)
    },

    __goToMonth (offset) {
      let
        month = Number(this.innerModel.month) + offset,
        yearDir = this.yearDirection

      if (month === 13) {
        month = 1
        this.innerModel.year++
        yearDir = 'left'
      }
      else if (month === 0) {
        month = 12
        this.innerModel.year--
        yearDir = 'right'
      }

      this.monthDirection = offset > 0 ? 'left' : 'right'
      this.yearDirection = yearDir
      this.innerModel.month = month
      this.emitImmediately === true && this.__updateValue({}, 'month')
    },

    __goToYear (offset) {
      this.monthDirection = this.yearDirection = offset > 0 ? 'left' : 'right'
      this.innerModel.year = Number(this.innerModel.year) + offset
      this.emitImmediately === true && this.__updateValue({}, 'year')
    },

    __setYear (year) {
      this.innerModel.year = year
      this.emitImmediately === true && this.__updateValue({ year }, 'year')
      this.view = this.extModel.month === null || this.defaultView === 'Years' ? 'Months' : 'Calendar'
    },

    __setMonth (month) {
      this.innerModel.month = month
      this.emitImmediately === true && this.__updateValue({ month }, 'month')
      this.view = 'Calendar'
    },

    __setDay (day) {
      this.__updateValue({ day }, 'day')
    },

    __updateValue (date, reason) {
      if (date.year === void 0) {
        date.year = this.innerModel.year
      }
      if (date.month === void 0) {
        date.month = this.innerModel.month
      }
      if (
        date.day === void 0 ||
        (this.emitImmediately === true && (reason === 'year' || reason === 'month'))
      ) {
        date.day = this.innerModel.day
        const maxDay = this.emitImmediately === true
          ? this.__getDaysInMonth(date)
          : this.daysInMonth

        date.day = Math.min(date.day, maxDay)
      }

      const val = this.calendar === 'persian'
        ? date.year + '/' + pad(date.month) + '/' + pad(date.day)
        : formatDate(
          new Date(
            date.year,
            date.month - 1,
            date.day,
            this.extModel.hour,
            this.extModel.minute,
            this.extModel.second,
            this.extModel.millisecond
          ),
          this.mask,
          this.computedLocale,
          date.year
        )

      date.changed = val !== this.value
      this.$emit('input', val, reason, date)

      if (val === this.value && reason === 'today') {
        const newHash = date.year + '/' + pad(date.month) + '/' + pad(date.day)
        const curHash = this.innerModel.year + '/' + pad(this.innerModel.month) + '/' + pad(this.innerModel.day)

        if (newHash !== curHash) {
          this.monthDirection = curHash < newHash ? 'left' : 'right'
          if (date.year !== this.innerModel.year) {
            this.yearDirection = this.monthDirection
          }

          this.$nextTick(() => {
            this.startYear = date.year - date.year % yearsInterval
            Object.assign(this.innerModel, {
              year: date.year,
              month: date.month,
              day: date.day,
              dateHash: newHash
            })
          })
        }
      }
    }
  },

  render (h) {
    return h('div', {
      staticClass: 'q-date',
      class: this.classes,
      on: this.$listeners,
      attrs: { role: 'region', 'aria-label': 'Calendar' }
    }, [
      this.__getHeader(h, { nextEl: 0 }),
      h('div', {
        staticClass: 'q-date__content relative-position overflow-auto',
        attrs: { tabindex: -1 },
        ref: 'blurTarget',
        on: {
          keydown: e => {
            if (e.keyCode === KEYCODE_TAB) {
              let index, firstElIndex, lastELIndex, activeElIndex
              var focusableElements = 'a:not([disabled]), button:not([disabled]), input[type=text]:not([disabled]), [tabindex]:not([disabled]):not([tabindex="-1"])'
              var focusable = Array.from(document.querySelectorAll(focusableElements))

              activeElIndex = focusable.indexOf(document.activeElement)
              firstElIndex = focusable.indexOf(this.__getFirstElement())
              lastELIndex = focusable.indexOf(this.__getLastElement())

              if (activeElIndex >= firstElIndex && activeElIndex <= lastELIndex) {
                if (e.getModifierState('Shift')) {
                  index = firstElIndex - 2
                }
                else {
                  index = lastELIndex
                }
                if (index > -1) {
                  var nextElement = focusable[index + 1] || focusable[0]
                  nextElement.focus()
                }
              }
            }
          }
        }
      }, [
        h('transition', {
          props: {
            name: 'q-transition--fade'
          }
        }, [
          this[`__get${this.view}View`](h)
        ])
      ])
    ])
  },

  updated () {
    this.__focusCurr()
  }
})
