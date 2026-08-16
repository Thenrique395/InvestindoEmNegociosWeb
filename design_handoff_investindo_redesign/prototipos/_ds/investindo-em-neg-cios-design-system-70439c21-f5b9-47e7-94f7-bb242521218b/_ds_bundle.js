/* @ds-bundle: {"format":4,"namespace":"InvestindoEmNegCiosDesignSystem_70439c","components":[{"name":"Badge","sourcePath":"components/display/Badge.jsx"},{"name":"Card","sourcePath":"components/display/Card.jsx"},{"name":"Tag","sourcePath":"components/display/Tag.jsx"},{"name":"Dialog","sourcePath":"components/feedback/Dialog.jsx"},{"name":"Toast","sourcePath":"components/feedback/Toast.jsx"},{"name":"Tooltip","sourcePath":"components/feedback/Tooltip.jsx"},{"name":"Button","sourcePath":"components/forms/Button.jsx"},{"name":"Checkbox","sourcePath":"components/forms/Checkbox.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"Radio","sourcePath":"components/forms/Radio.jsx"},{"name":"Select","sourcePath":"components/forms/Select.jsx"},{"name":"Switch","sourcePath":"components/forms/Switch.jsx"},{"name":"Tabs","sourcePath":"components/navigation/Tabs.jsx"}],"sourceHashes":{"components/display/Badge.jsx":"9c1d2639a999","components/display/Card.jsx":"278fc7f62e4e","components/display/Tag.jsx":"2a06239785f3","components/feedback/Dialog.jsx":"2f0171c8ea61","components/feedback/Toast.jsx":"a5369f69fe7c","components/feedback/Tooltip.jsx":"63e7dba271da","components/forms/Button.jsx":"67cd204056d2","components/forms/Checkbox.jsx":"d2b086679391","components/forms/Input.jsx":"16f72262612a","components/forms/Radio.jsx":"d892c101a1ee","components/forms/Select.jsx":"8bef6e298b69","components/forms/Switch.jsx":"75dd3e298b06","components/navigation/Tabs.jsx":"a19359716c09","ui_kits/website/Landing.jsx":"29d63119d5da"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.InvestindoEmNegCiosDesignSystem_70439c = window.InvestindoEmNegCiosDesignSystem_70439c || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/display/Badge.jsx
try { (() => {
/** Small status badge. tone: 'green' | 'neutral' | 'outline'. */
function Badge({
  tone = 'green',
  children,
  style
}) {
  const tones = {
    green: {
      background: 'var(--accent)',
      color: '#fff',
      border: '1px solid transparent'
    },
    neutral: {
      background: 'rgba(237,235,236,0.1)',
      color: 'var(--text-primary)',
      border: '1px solid transparent'
    },
    outline: {
      background: 'transparent',
      color: 'var(--text-accent)',
      border: '1px solid var(--accent)'
    }
  };
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      fontFamily: 'var(--font-sans)',
      fontSize: 12,
      fontWeight: 'var(--weight-demibold)',
      padding: '4px 12px',
      borderRadius: 'var(--radius-pill)',
      ...tones[tone],
      ...style
    }
  }, children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/Badge.jsx", error: String((e && e.message) || e) }); }

// components/display/Card.jsx
try { (() => {
/** Surface card on navy. variant 'dark' (default) raised navy; 'light' off-white. */
function Card({
  variant = 'dark',
  padding = 24,
  children,
  style
}) {
  const variants = {
    dark: {
      background: 'var(--surface-card)',
      border: '1px solid var(--border-on-dark)',
      color: 'var(--text-primary)',
      boxShadow: 'var(--shadow-card)'
    },
    light: {
      background: 'var(--surface-light)',
      border: '1px solid var(--border-on-light)',
      color: 'var(--text-on-light)',
      boxShadow: 'var(--shadow-light)'
    }
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      borderRadius: 'var(--radius-lg)',
      padding,
      fontFamily: 'var(--font-sans)',
      ...variants[variant],
      ...style
    }
  }, children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/Card.jsx", error: String((e && e.message) || e) }); }

// components/display/Tag.jsx
try { (() => {
/** Capsule label like the "Novos vídeos" highlight on the YouTube banner. */
function Tag({
  variant = 'capsule',
  children,
  style
}) {
  const variants = {
    capsule: {
      background: 'var(--accent)',
      color: '#fff',
      borderRadius: 4
    },
    quiet: {
      background: 'var(--accent-soft)',
      color: 'var(--text-accent)',
      borderRadius: 4
    }
  };
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-block',
      fontFamily: 'var(--font-sans)',
      fontSize: 15,
      fontWeight: 'var(--weight-demibold)',
      padding: '3px 12px',
      ...variants[variant],
      ...style
    }
  }, children);
}
Object.assign(__ds_scope, { Tag });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/Tag.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Dialog.jsx
try { (() => {
/** Modal dialog on a dimmed backdrop. */
function Dialog({
  open = false,
  title,
  children,
  onClose,
  actions,
  width = 440,
  style
}) {
  if (!open) return null;
  return /*#__PURE__*/React.createElement("div", {
    onClick: e => {
      if (e.target === e.currentTarget && onClose) onClose();
    },
    style: {
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 20, 28, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      fontFamily: 'var(--font-sans)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width,
      maxWidth: 'calc(100vw - 48px)',
      boxSizing: 'border-box',
      background: 'var(--surface-card)',
      color: 'var(--text-primary)',
      border: '1px solid var(--border-on-dark)',
      borderRadius: 'var(--radius-lg)',
      padding: 28,
      boxShadow: 'var(--shadow-pop)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 16
    }
  }, title && /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: '0 0 12px',
      fontSize: 20,
      fontWeight: 'var(--weight-bold)'
    }
  }, title), onClose && /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    "aria-label": "Fechar",
    style: {
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      color: 'var(--text-secondary)',
      fontSize: 18,
      lineHeight: 1,
      padding: 4
    }
  }, "\xD7")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      lineHeight: 'var(--leading-body)',
      color: 'var(--text-secondary)'
    }
  }, children), actions && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'flex-end',
      gap: 10,
      marginTop: 22
    }
  }, actions)));
}
Object.assign(__ds_scope, { Dialog });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Dialog.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Toast.jsx
try { (() => {
/** Inline toast notification. tone: 'success' | 'error' | 'neutral'. */
function Toast({
  tone = 'success',
  children,
  onDismiss,
  style
}) {
  const bars = {
    success: 'var(--success)',
    error: 'var(--danger)',
    neutral: 'var(--text-secondary)'
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 12,
      background: 'var(--surface-card)',
      color: 'var(--text-primary)',
      border: '1px solid var(--border-on-dark)',
      borderLeft: `3px solid ${bars[tone]}`,
      borderRadius: 'var(--radius-md)',
      padding: '12px 16px',
      boxShadow: 'var(--shadow-card)',
      fontFamily: 'var(--font-sans)',
      fontSize: 14,
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", null, children), onDismiss && /*#__PURE__*/React.createElement("button", {
    onClick: onDismiss,
    "aria-label": "Fechar",
    style: {
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      color: 'var(--text-secondary)',
      fontSize: 16,
      lineHeight: 1,
      padding: 2
    }
  }, "\xD7"));
}
Object.assign(__ds_scope, { Toast });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Toast.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Tooltip.jsx
try { (() => {
/** Hover tooltip. Wraps its child; shows `text` above on hover. */
function Tooltip({
  text,
  children,
  style
}) {
  const [show, setShow] = React.useState(false);
  return /*#__PURE__*/React.createElement("span", {
    onMouseEnter: () => setShow(true),
    onMouseLeave: () => setShow(false),
    style: {
      position: 'relative',
      display: 'inline-block',
      ...style
    }
  }, children, show && /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      bottom: 'calc(100% + 8px)',
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'var(--in-black)',
      color: 'var(--in-offwhite)',
      fontFamily: 'var(--font-sans)',
      fontSize: 12,
      fontWeight: 'var(--weight-medium)',
      padding: '6px 12px',
      borderRadius: 'var(--radius-sm)',
      whiteSpace: 'nowrap',
      boxShadow: 'var(--shadow-card)',
      zIndex: 50,
      pointerEvents: 'none'
    }
  }, text));
}
Object.assign(__ds_scope, { Tooltip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Tooltip.jsx", error: String((e && e.message) || e) }); }

// components/forms/Button.jsx
try { (() => {
/** Investindo em Negócios button. Primary = green pill with uppercase wide-tracked label. */
function Button({
  variant = 'primary',
  size = 'md',
  disabled = false,
  fullWidth = false,
  onClick,
  children,
  style
}) {
  const sizes = {
    sm: {
      padding: '8px 18px',
      fontSize: 12
    },
    md: {
      padding: '12px 26px',
      fontSize: 13
    },
    lg: {
      padding: '16px 34px',
      fontSize: 14
    }
  };
  const variants = {
    primary: {
      background: 'var(--accent)',
      color: '#fff',
      border: '1px solid transparent'
    },
    secondary: {
      background: 'transparent',
      color: 'var(--text-primary)',
      border: '1px solid var(--border-on-dark)'
    },
    ghost: {
      background: 'transparent',
      color: 'var(--text-accent)',
      border: '1px solid transparent'
    }
  };
  const [hover, setHover] = React.useState(false);
  const hoverStyles = {
    primary: {
      background: 'var(--accent-hover)'
    },
    secondary: {
      borderColor: 'rgba(237,235,236,0.4)'
    },
    ghost: {
      background: 'var(--accent-soft)'
    }
  };
  return /*#__PURE__*/React.createElement("button", {
    onClick: onClick,
    disabled: disabled,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      fontFamily: 'var(--font-sans)',
      fontWeight: 'var(--weight-demibold)',
      letterSpacing: 'var(--tracking-wide)',
      textTransform: 'uppercase',
      borderRadius: 'var(--radius-pill)',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.45 : 1,
      transition: 'background var(--dur-fast) var(--ease-brand), border-color var(--dur-fast) var(--ease-brand)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      width: fullWidth ? '100%' : undefined,
      ...sizes[size],
      ...variants[variant],
      ...(hover && !disabled ? hoverStyles[variant] : null),
      ...style
    }
  }, children);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Button.jsx", error: String((e && e.message) || e) }); }

// components/forms/Checkbox.jsx
try { (() => {
/** Checkbox with green checked fill. */
function Checkbox({
  label,
  checked,
  onChange,
  disabled = false,
  style
}) {
  const [internal, setInternal] = React.useState(false);
  const isChecked = checked !== undefined ? checked : internal;
  const toggle = e => {
    if (checked === undefined) setInternal(e.target.checked);
    if (onChange) onChange(e);
  };
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 10,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.45 : 1,
      fontFamily: 'var(--font-sans)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: isChecked,
    onChange: toggle,
    disabled: disabled,
    style: {
      position: 'absolute',
      opacity: 0,
      width: 0,
      height: 0
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 20,
      height: 20,
      borderRadius: 'var(--radius-sm)',
      boxSizing: 'border-box',
      border: `1.5px solid ${isChecked ? 'var(--accent)' : 'var(--border-on-dark)'}`,
      background: isChecked ? 'var(--accent)' : 'rgba(237,235,236,0.06)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'background var(--dur-fast) var(--ease-brand)'
    }
  }, isChecked && /*#__PURE__*/React.createElement("svg", {
    width: "11",
    height: "9",
    viewBox: "0 0 11 9",
    fill: "none"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M1 4.5L4 7.5L10 1.5",
    stroke: "#fff",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }))), label && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      color: 'var(--text-primary)'
    }
  }, label));
}
Object.assign(__ds_scope, { Checkbox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Checkbox.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
/** Text input on dark surfaces. */
function Input({
  label,
  placeholder,
  value,
  onChange,
  type = 'text',
  disabled = false,
  error,
  style
}) {
  const [focus, setFocus] = React.useState(false);
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      fontFamily: 'var(--font-sans)',
      ...style
    }
  }, label && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      fontWeight: 'var(--weight-medium)',
      color: 'var(--text-primary)'
    }
  }, label), /*#__PURE__*/React.createElement("input", {
    type: type,
    placeholder: placeholder,
    value: value,
    onChange: onChange,
    disabled: disabled,
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 14,
      color: 'var(--text-primary)',
      background: 'rgba(237,235,236,0.06)',
      border: `1px solid ${error ? 'var(--danger)' : focus ? 'var(--accent)' : 'var(--border-on-dark)'}`,
      borderRadius: 'var(--radius-md)',
      padding: '12px 14px',
      outline: 'none',
      boxShadow: focus ? 'var(--focus-ring)' : 'none',
      opacity: disabled ? 0.45 : 1,
      transition: 'border-color var(--dur-fast) var(--ease-brand), box-shadow var(--dur-fast) var(--ease-brand)'
    }
  }), error && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: 'var(--danger)'
    }
  }, error));
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/Radio.jsx
try { (() => {
/** Radio group. options: string[] or [{value,label}]. */
function Radio({
  label,
  options = [],
  value,
  onChange,
  name,
  disabled = false,
  style
}) {
  const [internal, setInternal] = React.useState(value);
  const current = value !== undefined && onChange ? value : internal;
  const opts = options.map(o => typeof o === 'string' ? {
    value: o,
    label: o
  } : o);
  const groupName = React.useMemo(() => name || 'radio-' + Math.random().toString(36).slice(2, 8), [name]);
  const pick = v => {
    if (!(value !== undefined && onChange)) setInternal(v);
    if (onChange) onChange(v);
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      fontFamily: 'var(--font-sans)',
      ...style
    }
  }, label && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      fontWeight: 'var(--weight-medium)',
      color: 'var(--text-primary)'
    }
  }, label), opts.map(o => {
    const on = current === o.value;
    return /*#__PURE__*/React.createElement("label", {
      key: o.value,
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1
      }
    }, /*#__PURE__*/React.createElement("input", {
      type: "radio",
      name: groupName,
      checked: on,
      onChange: () => pick(o.value),
      disabled: disabled,
      style: {
        position: 'absolute',
        opacity: 0,
        width: 0,
        height: 0
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        width: 20,
        height: 20,
        borderRadius: '50%',
        boxSizing: 'border-box',
        border: `1.5px solid ${on ? 'var(--accent)' : 'var(--border-on-dark)'}`,
        background: 'rgba(237,235,236,0.06)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'border-color var(--dur-fast) var(--ease-brand)'
      }
    }, on && /*#__PURE__*/React.createElement("span", {
      style: {
        width: 10,
        height: 10,
        borderRadius: '50%',
        background: 'var(--accent)'
      }
    })), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 14,
        color: 'var(--text-primary)'
      }
    }, o.label));
  }));
}
Object.assign(__ds_scope, { Radio });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Radio.jsx", error: String((e && e.message) || e) }); }

// components/forms/Select.jsx
try { (() => {
/** Native select styled for dark surfaces. options: [{value, label}] or string[]. */
function Select({
  label,
  options = [],
  value,
  onChange,
  disabled = false,
  style
}) {
  const [focus, setFocus] = React.useState(false);
  const opts = options.map(o => typeof o === 'string' ? {
    value: o,
    label: o
  } : o);
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      fontFamily: 'var(--font-sans)',
      ...style
    }
  }, label && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      fontWeight: 'var(--weight-medium)',
      color: 'var(--text-primary)'
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("select", {
    value: value,
    onChange: onChange,
    disabled: disabled,
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    style: {
      width: '100%',
      appearance: 'none',
      WebkitAppearance: 'none',
      fontFamily: 'var(--font-sans)',
      fontSize: 14,
      color: 'var(--text-primary)',
      background: 'rgba(237,235,236,0.06)',
      border: `1px solid ${focus ? 'var(--accent)' : 'var(--border-on-dark)'}`,
      borderRadius: 'var(--radius-md)',
      padding: '12px 38px 12px 14px',
      outline: 'none',
      boxShadow: focus ? 'var(--focus-ring)' : 'none',
      opacity: disabled ? 0.45 : 1,
      cursor: disabled ? 'not-allowed' : 'pointer'
    }
  }, opts.map(o => /*#__PURE__*/React.createElement("option", {
    key: o.value,
    value: o.value,
    style: {
      color: '#262626'
    }
  }, o.label))), /*#__PURE__*/React.createElement("svg", {
    width: "12",
    height: "8",
    viewBox: "0 0 12 8",
    fill: "none",
    style: {
      position: 'absolute',
      right: 14,
      top: '50%',
      transform: 'translateY(-50%)',
      pointerEvents: 'none'
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M1 1.5L6 6.5L11 1.5",
    stroke: "var(--in-green)",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }))));
}
Object.assign(__ds_scope, { Select });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Select.jsx", error: String((e && e.message) || e) }); }

// components/forms/Switch.jsx
try { (() => {
/** Toggle switch; green when on. */
function Switch({
  label,
  checked,
  onChange,
  disabled = false,
  style
}) {
  const [internal, setInternal] = React.useState(false);
  const on = checked !== undefined ? checked : internal;
  const toggle = () => {
    if (disabled) return;
    if (checked === undefined) setInternal(!on);
    if (onChange) onChange(!on);
  };
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 10,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.45 : 1,
      fontFamily: 'var(--font-sans)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("button", {
    role: "switch",
    "aria-checked": on,
    onClick: toggle,
    disabled: disabled,
    style: {
      width: 44,
      height: 24,
      borderRadius: 'var(--radius-pill)',
      border: 'none',
      padding: 2,
      background: on ? 'var(--accent)' : 'rgba(237,235,236,0.18)',
      display: 'flex',
      justifyContent: on ? 'flex-end' : 'flex-start',
      alignItems: 'center',
      cursor: 'inherit',
      transition: 'background var(--dur-fast) var(--ease-brand)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 20,
      height: 20,
      borderRadius: '50%',
      background: '#fff',
      boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
      transition: 'transform var(--dur-fast) var(--ease-brand)'
    }
  })), label && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      color: 'var(--text-primary)'
    }
  }, label));
}
Object.assign(__ds_scope, { Switch });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Switch.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Tabs.jsx
try { (() => {
/** Underline tabs. tabs: string[]. Controlled via active/onChange or uncontrolled. */
function Tabs({
  tabs = [],
  active,
  onChange,
  style
}) {
  const [internal, setInternal] = React.useState(0);
  const current = active !== undefined ? active : internal;
  const pick = i => {
    if (active === undefined) setInternal(i);
    if (onChange) onChange(i);
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 4,
      borderBottom: '1px solid var(--border-on-dark)',
      fontFamily: 'var(--font-sans)',
      ...style
    }
  }, tabs.map((t, i) => {
    const on = current === i;
    return /*#__PURE__*/React.createElement("button", {
      key: t,
      onClick: () => pick(i),
      style: {
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        fontFamily: 'inherit',
        fontSize: 14,
        fontWeight: on ? 'var(--weight-demibold)' : 'var(--weight-regular)',
        color: on ? 'var(--text-primary)' : 'var(--text-secondary)',
        padding: '10px 16px',
        borderBottom: on ? '2px solid var(--accent)' : '2px solid transparent',
        marginBottom: -1,
        transition: 'color var(--dur-fast) var(--ease-brand)'
      }
    }, t);
  }));
}
Object.assign(__ds_scope, { Tabs });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Tabs.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/Landing.jsx
try { (() => {
const {
  Button,
  Input,
  Select,
  Card,
  Badge,
  Tag,
  Dialog,
  Toast
} = window.InvestindoEmNegCiosDesignSystem_70439c;
function Nav({
  onLogin
}) {
  const links = ['Home', 'Quem somos', 'Blog'];
  const [active, setActive] = React.useState(0);
  return /*#__PURE__*/React.createElement("nav", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '18px 56px',
      background: 'rgba(0, 35, 47, 0.6)',
      backdropFilter: 'blur(8px)',
      position: 'sticky',
      top: 0,
      zIndex: 20,
      borderBottom: '1px solid var(--border-on-dark)'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/logo/lockup-horizontal-light.png",
    alt: "Investindo em Neg\xF3cios",
    style: {
      height: 40
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 34
    }
  }, links.map((l, i) => /*#__PURE__*/React.createElement("a", {
    key: l,
    href: "#",
    onClick: e => {
      e.preventDefault();
      setActive(i);
    },
    style: {
      color: active === i ? 'var(--in-green-300)' : 'var(--text-primary)',
      textDecoration: 'none',
      fontSize: 15,
      fontWeight: active === i ? 600 : 400
    }
  }, l)), /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    onClick: onLogin
  }, "Login \u2192")));
}
function Hero({
  onJoin
}) {
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: 'linear-gradient(115deg, #00232F 0%, #063D31 55%, #14573F 100%)',
      padding: '72px 56px 88px',
      display: 'grid',
      gridTemplateColumns: '1.1fr 1fr',
      gap: 48,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 560
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      fontSize: 'var(--text-display)',
      lineHeight: 'var(--leading-tight)',
      fontWeight: 800,
      color: 'var(--text-primary)',
      margin: '0 0 20px'
    }
  }, "Seu caminho para a ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--in-green-300)'
    }
  }, "liberdade financeira"), " come\xE7a aqui."), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 'var(--text-body-lg)',
      lineHeight: 'var(--leading-body)',
      color: 'var(--text-secondary)',
      margin: '0 0 32px'
    }
  }, "Est\xE1 pronto para trilhar uma jornada transformadora em dire\xE7\xE3o ao sucesso financeiro? Inscreva-se agora e comece a construir um futuro pr\xF3spero e abundante. Junte-se a n\xF3s nessa busca pela prosperidade e liberdade financeira!"), /*#__PURE__*/React.createElement(Button, {
    size: "lg",
    onClick: onJoin
  }, "Quero fazer parte")), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 380,
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      border: '1px solid var(--border-on-dark)',
      background: 'url(../../assets/backgrounds/wallpaper-pattern.jpg) center / cover',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--text-secondary)',
      fontSize: 13,
      background: 'rgba(0,35,47,0.75)',
      padding: '8px 16px',
      borderRadius: 'var(--radius-pill)'
    }
  }, "Foto lifestyle (n\xE3o fornecida) \u2014 substitua por imagem real")));
}
function Simulator() {
  const [monthly, setMonthly] = React.useState('500');
  const [years, setYears] = React.useState('10');
  const [profile, setProfile] = React.useState('Moderado');
  const [result, setResult] = React.useState(null);
  const simulate = () => {
    const m = parseFloat(monthly.replace(',', '.')) || 0;
    const y = parseInt(years) || 0;
    const rate = {
      'Conservador': 0.008,
      'Moderado': 0.010,
      'Arrojado': 0.012
    }[profile];
    let total = 0;
    for (let i = 0; i < y * 12; i++) total = (total + m) * (1 + rate);
    setResult(total.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0
    }));
  };
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: 'var(--surface-light)',
      padding: '72px 56px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1000,
      margin: '0 auto',
      display: 'grid',
      gridTemplateColumns: '1fr 1.2fr',
      gap: 48,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Tag, null, "\xC9 gr\xE1tis!"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontSize: 'var(--text-h1)',
      fontWeight: 800,
      color: 'var(--text-on-light)',
      margin: '14px 0 14px',
      lineHeight: 'var(--leading-tight)'
    }
  }, "Simulador de Investimentos"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 'var(--text-body-lg)',
      lineHeight: 'var(--leading-body)',
      color: 'var(--text-muted-on-light)',
      margin: 0
    }
  }, "Descubra quanto precisa investir mensalmente para alcan\xE7ar a sua liberdade financeira no prazo desejado. Fa\xE7a agora.")), /*#__PURE__*/React.createElement(Card, {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(Input, {
    label: "Aporte mensal (R$)",
    value: monthly,
    onChange: e => setMonthly(e.target.value)
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(Input, {
    label: "Prazo (anos)",
    value: years,
    onChange: e => setYears(e.target.value)
  }), /*#__PURE__*/React.createElement(Select, {
    label: "Perfil",
    options: ['Conservador', 'Moderado', 'Arrojado'],
    value: profile,
    onChange: e => setProfile(e.target.value)
  })), /*#__PURE__*/React.createElement(Button, {
    fullWidth: true,
    onClick: simulate
  }, "Simular"), result && /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      paddingTop: 4
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      color: 'var(--text-secondary)'
    }
  }, "Patrim\xF4nio estimado"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 32,
      fontWeight: 800,
      color: 'var(--in-green-300)'
    }
  }, result)))));
}
function Footer() {
  return /*#__PURE__*/React.createElement("footer", {
    style: {
      background: 'var(--in-navy-900)',
      padding: '40px 56px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/logo/lockup-horizontal-light.png",
    alt: "",
    style: {
      height: 34
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--text-secondary)',
      fontSize: 13
    }
  }, "Siga nossas redes sociais \u2014 YouTube \xB7 Instagram \xB7 WhatsApp"));
}
function App() {
  const [login, setLogin] = React.useState(false);
  const [toast, setToast] = React.useState(false);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-sans)',
      background: 'var(--surface-page)',
      minHeight: '100vh'
    }
  }, /*#__PURE__*/React.createElement(Nav, {
    onLogin: () => setLogin(true)
  }), /*#__PURE__*/React.createElement(Hero, {
    onJoin: () => {
      setToast(true);
      setTimeout(() => setToast(false), 3500);
    }
  }), /*#__PURE__*/React.createElement(Simulator, null), /*#__PURE__*/React.createElement(Footer, null), /*#__PURE__*/React.createElement(Dialog, {
    open: login,
    title: "Login",
    onClose: () => setLogin(false),
    actions: /*#__PURE__*/React.createElement(Button, {
      onClick: () => setLogin(false)
    }, "Entrar")
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
      marginTop: 4
    }
  }, /*#__PURE__*/React.createElement(Input, {
    label: "E-mail",
    placeholder: "seu@email.com",
    type: "email"
  }), /*#__PURE__*/React.createElement(Input, {
    label: "Senha",
    placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022",
    type: "password"
  }))), toast && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'fixed',
      bottom: 24,
      right: 24,
      zIndex: 200
    }
  }, /*#__PURE__*/React.createElement(Toast, {
    tone: "success",
    onDismiss: () => setToast(false)
  }, "Inscri\xE7\xE3o recebida. Bem-vindo \xE0 jornada!")));
}
ReactDOM.createRoot(document.getElementById('root')).render(/*#__PURE__*/React.createElement(App, null));
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/Landing.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.Tag = __ds_scope.Tag;

__ds_ns.Dialog = __ds_scope.Dialog;

__ds_ns.Toast = __ds_scope.Toast;

__ds_ns.Tooltip = __ds_scope.Tooltip;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Checkbox = __ds_scope.Checkbox;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Radio = __ds_scope.Radio;

__ds_ns.Select = __ds_scope.Select;

__ds_ns.Switch = __ds_scope.Switch;

__ds_ns.Tabs = __ds_scope.Tabs;

})();
