/* eslint-disable import/no-unresolved */
import React, { useEffect, useRef, useState } from 'react';
import { PreviewBox } from './PreviewBox';
import { ToolTip } from '@/Editor/Inspector/Elements/Components/ToolTip';
import { useTranslation } from 'react-i18next';
import { camelCase, isEmpty } from 'lodash';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { autocompletion } from '@codemirror/autocomplete';
import FxButton from '../CodeBuilder/Elements/FxButton';
import cx from 'classnames';
import { DynamicFxTypeRenderer } from './DynamicFxTypeRenderer';
import { resolveReferences } from './utils';
import { okaidia } from '@uiw/codemirror-theme-okaidia';
import { githubLight } from '@uiw/codemirror-theme-github';
import { getAutocompletion } from './autocompleteExtensionConfig';
import ErrorBoundary from '../ErrorBoundary';
import CodeHinter from './CodeHinter';

const SingleLineCodeEditor = ({ suggestions, componentName, fieldMeta = {}, fxActive, ...restProps }) => {
  const { initialValue, onChange, enablePreview = true, portalProps } = restProps;
  const { validation = {} } = fieldMeta;

  const [isFocused, setIsFocused] = useState(false);
  const [currentValue, setCurrentValue] = useState('');
  const [errorStateActive, setErrorStateActive] = useState(false);

  const isPreviewFocused = useRef(false);
  const wrapperRef = useRef(null);

  //! Re render the component when the componentName changes as the initialValue is not updated

  useEffect(() => {
    if (fxActive && initialValue?.startsWith('{{')) {
      const _value = initialValue?.replace(/{{/g, '').replace(/}}/g, '');
      return setCurrentValue(_value);
    }

    setCurrentValue(initialValue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [componentName]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (portalProps?.isOpen) {
        return;
      }

      if (wrapperRef.current && isFocused && !wrapperRef.current.contains(event.target)) {
        isPreviewFocused.current = false;
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wrapperRef, isFocused, isPreviewFocused, currentValue, portalProps?.isOpen]);

  const renderPreview = () => {
    if (!enablePreview) return null;

    return (
      <PreviewBox
        currentValue={currentValue}
        isFocused={isFocused}
        componentName={componentName}
        validationSchema={validation}
        setErrorStateActive={setErrorStateActive}
        ignoreValidation={restProps?.ignoreValidation || isEmpty(validation)}
        componentId={restProps?.componentId ?? null}
        fxActive={fxActive}
      />
    );
  };

  return (
    <div
      ref={wrapperRef}
      className="code-hinter-wrapper position-relative"
      style={{ width: '100%', height: restProps?.lang === 'jsx' && '320px' }}
    >
      <div className="code-editor-basic-wrapper d-flex">
        <div className="codehinter-container w-100">
          <SingleLineCodeEditor.Editor
            currentValue={currentValue}
            setCurrentValue={setCurrentValue}
            hints={suggestions}
            setFocus={setIsFocused}
            validationType={validation?.schema?.type}
            onBlurUpdate={onChange}
            error={errorStateActive}
            cyLabel={restProps.cyLabel}
            renderPreview={renderPreview}
            portalProps={portalProps}
            componentName={componentName}
            fxActive={fxActive}
            {...restProps}
          />

          {!portalProps?.isOpen && renderPreview()}
        </div>
      </div>
    </div>
  );
};

const EditorInput = ({
  currentValue,
  setCurrentValue,
  hints,
  setFocus,
  validationType,
  onBlurUpdate,
  placeholder = '',
  error,
  cyLabel,
  componentName,
  usePortalEditor = true,
  renderPreview,
  portalProps,
  ignoreValidation,
  fxActive,
  lang,
}) => {
  function autoCompleteExtensionConfig(context) {
    let word = context.matchBefore(/\w*/);

    const shoudlReturnEarly = word.text === '' && word.from == word.to ? false : word.from == word.to;

    if (shoudlReturnEarly && !context.explicit) return null;

    let completions = getAutocompletion(context.state.doc.toString(), validationType, hints, fxActive);
    return {
      from: word.from,
      options: completions,
      validFor: !fxActive ? /^\{\{.*\}\}$/ : '',
    };
  }

  const autoCompleteConfig = autocompletion({
    override: [autoCompleteExtensionConfig],
    compareCompletions: (a, b) => {
      return a.label < b.label ? -1 : 1;
    },
    aboveCursor: false,
    defaultKeymap: true,
  });

  const handleOnChange = React.useCallback((val) => {
    setCurrentValue(val);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOnBlur = React.useCallback(() => {
    if (ignoreValidation) {
      return onBlurUpdate(currentValue);
    }

    if (!error) {
      const _value = fxActive ? `{{${currentValue}}}` : currentValue;

      onBlurUpdate(_value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentValue, error]);

  const darkMode = localStorage.getItem('darkMode') === 'true';
  const theme = darkMode ? okaidia : githubLight;

  const { handleTogglePopupExapand, isOpen, setIsOpen, forceUpdate } = portalProps;

  return (
    <div className={`cm-codehinter ${darkMode && 'cm-codehinter-dark-themed'}`} cyLabel={cyLabel}>
      {usePortalEditor && (
        <CodeHinter.PopupIcon
          callback={handleTogglePopupExapand}
          icon="portal-open"
          tip="Pop out code editor into a new window"
          transformation={componentName === 'transformation'}
        />
      )}
      <CodeHinter.Portal
        isCopilotEnabled={false}
        isOpen={isOpen}
        callback={setIsOpen}
        componentName={componentName}
        key={componentName}
        customComponent={renderPreview}
        forceUpdate={forceUpdate}
        optionalProps={{ styles: { height: 300 }, cls: '' }}
        darkMode={darkMode}
        selectors={{ className: 'preview-block-portal' }}
        dragResizePortal={true}
        callgpt={null}
      >
        <ErrorBoundary>
          <CodeMirror
            value={currentValue}
            placeholder={placeholder}
            height={lang === 'jsx' ? '400px' : '100%'}
            width="100%"
            extensions={[javascript({ jsx: lang === 'jsx' }), autoCompleteConfig]}
            onChange={handleOnChange}
            basicSetup={{
              lineNumbers: lang === 'jsx',
              syntaxHighlighting: true,
              bracketMatching: true,
              foldGutter: false,
              highlightActiveLine: false,
              autocompletion: true,
            }}
            onFocus={() => setFocus(true)}
            onBlur={handleOnBlur}
            className={`codehinter-input ${error && 'border-danger'}`}
            theme={theme}
          />
        </ErrorBoundary>
      </CodeHinter.Portal>
    </div>
  );
};

const DynamicEditorBridge = (props) => {
  const {
    initialValue,
    type,
    fxActive,
    paramType,
    paramLabel,
    paramName,
    fieldMeta,
    darkMode,
    options,
    className,
    onFxPress,
    cyLabel = '',
    verticalLine = false,
    onChange,
  } = props;

  const [forceCodeBox, setForceCodeBox] = React.useState(fxActive);
  const codeShow = paramType === 'code' || forceCodeBox;

  const HIDDEN_CODE_HINTER_LABELS = ['Table data', 'Column data'];

  const { t } = useTranslation();
  const [_, error, value] = type === 'fxEditor' ? resolveReferences(initialValue) : [];

  return (
    <div className={cx({ 'codeShow-active': codeShow })}>
      <div className={cx('d-flex align-items-center justify-content-between')}>
        {paramLabel === 'Type' && <div className="field-type-vertical-line"></div>}
        {paramLabel && !HIDDEN_CODE_HINTER_LABELS.includes(paramLabel) && (
          <div className={`field ${className}`} data-cy={`${cyLabel}-widget-parameter-label`}>
            <ToolTip
              label={t(`widget.commonProperties.${camelCase(paramLabel)}`, paramLabel)}
              meta={fieldMeta}
              labelClass={`tj-text-xsm color-slate12 ${codeShow ? 'mb-2' : 'mb-0'} ${
                darkMode && 'color-whitish-darkmode'
              }`}
            />
          </div>
        )}
        <div className={`${(paramType ?? 'code') === 'code' ? 'd-none' : ''} `}>
          <div
            style={{ width: paramType, marginBottom: codeShow ? '0.5rem' : '0px' }}
            className="d-flex align-items-center"
          >
            <div className="col-auto pt-0 fx-common">
              {paramLabel !== 'Type' && (
                <FxButton
                  active={codeShow}
                  onPress={() => {
                    if (codeShow) {
                      setForceCodeBox(false);
                      onFxPress(false);
                    } else {
                      setForceCodeBox(true);
                      onFxPress(true);
                    }
                  }}
                  dataCy={cyLabel}
                />
              )}
            </div>
            {!codeShow && (
              <DynamicFxTypeRenderer
                value={!error ? value : ''}
                onChange={onChange}
                paramName={paramName}
                paramLabel={paramLabel}
                paramType={paramType}
                forceCodeBox={() => {
                  setForceCodeBox(true);
                  onFxPress(true);
                }}
                meta={fieldMeta}
                cyLabel={cyLabel}
              />
            )}
          </div>
        </div>
      </div>
      {codeShow && (
        <div className={`row custom-row`} style={{ display: codeShow ? 'flex' : 'none' }}>
          <div className={`col code-hinter-col`}>
            <div className="d-flex">
              <div className={`${verticalLine && 'code-hinter-vertical-line'}`}></div>
              <SingleLineCodeEditor initialValue {...props} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

SingleLineCodeEditor.Editor = EditorInput;
SingleLineCodeEditor.EditorBridge = DynamicEditorBridge;

export default SingleLineCodeEditor;
