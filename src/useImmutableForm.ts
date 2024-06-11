/* eslint-disable max-lines */

import Immutable from "immutable";
import React, { useCallback } from "react";
import { getInitialState, reducer } from "./reducers";
import { FormOptions, ID_FieldName, INDEX_FieldName, ImmutableFormHandlers, ImmutableFormValidatorFunc, onSubmitFunc } from "./types";
import { FORM_ERROR, getDefaultField } from "./util";
import { generateUniqueUUIDv4 } from "./uuid";
import { getWords } from "./words";

const 
  /**
   * Custom hook to handle form logic.
   * 
   * @param {FormOptions} options - The configuration options for the form.
   * @param {onSubmitFunc} onSubmit - The function to handle form submission.
   * @returns {FormInterface} The form interface to manage form state and actions.
   */
  useImmutableForm = (options : FormOptions, onSubmit: onSubmitFunc) => {
    const 
      initialState = React.useMemo(() => getInitialState(options), []),
      [formData, dispatchFormAction] = React.useReducer(reducer, initialState),

      formState = formData.get("state") as Immutable.Map<string, any>,
      management = formData.get("management") as Immutable.Map<string, any>,

      setFieldValidator = useCallback((idFieldName: ID_FieldName, value : ImmutableFormValidatorFunc) => {
        dispatchFormAction({
          type    : "form-set-field-validator",
          payload : {
            idFieldName, 
            value,
          },
        });
      }, [dispatchFormAction]),
      
      getFormData = useCallback(() => (
        formData as  Immutable.Map<string, any>
      ), [formData]),

      getFieldState = useCallback((fieldName : string) => (
        (formData.getIn(["state", fieldName]) || getDefaultField(fieldName, "")) as Immutable.Map<string, any>
      ),  [formData]),

      handleChange = useCallback((idFieldName : ID_FieldName, indexFieldName : INDEX_FieldName, value : any) => {
        dispatchFormAction({
          type    : "field-event-onChange",
          payload : {
            indexFieldName,
            idFieldName,
            value,
          },
        });
      }, [dispatchFormAction]),

      handleFocus = useCallback((idFieldName : ID_FieldName, indexFieldName : INDEX_FieldName) => {
        dispatchFormAction({
          type    : "field-event-onFocus",
          payload : {
            idFieldName,
            indexFieldName,
          },
        });
      }, [dispatchFormAction]),

      handleBlur = useCallback((idFieldName : ID_FieldName, indexFieldName : INDEX_FieldName) => {
        dispatchFormAction({
          type    : "field-event-onBlur",
          payload : {
            idFieldName,
            indexFieldName,
          },
        });
      }, [dispatchFormAction]),

      registerField = useCallback((idFieldName : ID_FieldName, indexFieldName : INDEX_FieldName) => {
        dispatchFormAction({
          type    : "field-event-registerField",
          payload : {
            idFieldName,
            indexFieldName,
          },
        });
      }, [dispatchFormAction]),

      unregisterField = useCallback((idFieldName : ID_FieldName, indexFieldName: INDEX_FieldName) => {
        dispatchFormAction({
          type    : "field-event-unregisterField",
          payload : {
            idFieldName,
            indexFieldName,
          },
        });
      }, [dispatchFormAction]),

      handleArrayAdd = useCallback((listName : string, data = Immutable.Map<string, any>()) => {
        dispatchFormAction({
          type    : "array-event-add",
          payload : {
            ID: generateUniqueUUIDv4(),
            listName,
            data,
          },
        });
      }, [dispatchFormAction]),

      handleArrayRemove = useCallback((listName : string, ID : string) => {
        dispatchFormAction({
          type    : "array-event-remove",
          payload : {
            listName,
            ID,
          },
        });
      }, [dispatchFormAction]),

      formSubmitHandled = useCallback(() => {
        dispatchFormAction({
          type: "form-event-submitHandled",
        });
      }, [dispatchFormAction]),

      formSetIsSubmitting = useCallback((isSubmitting : boolean, error?: string) => {
        dispatchFormAction({
          type    : "form-set-isSubmitting",
          payload : {
            error,
            isSubmitting,
          },
        });
      }, [dispatchFormAction]),

      handleSubmit =  useCallback((event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        dispatchFormAction({
          type: "form-event-onSubmit",
        });

      }, [dispatchFormAction]),

      api = React.useMemo(() => {
        const inner :ImmutableFormHandlers = {
          // form
          formState,
          management,
          handleSubmit,
          getFormData,
          getFieldState,
  
          // array mutators
          handleArrayAdd,
          handleArrayRemove,
          
          // field mutators
          handleChange,
          handleFocus,
          handleBlur,
          setFieldValidator,
          registerField,
          unregisterField,
        };
        
        return inner; 
      }, [formState, management]);

    React.useEffect(() => {
      const 
        performSubmit = (values : Immutable.Map<string, any>, errors : Immutable.Map<string, any>) => {
          const               
            hasErrors = errors.size !== 0,
            setError = (err : string) =>  {
              formSetIsSubmitting(false, err);
            },
            handleNoError = () => {
              const 
                performForm = () => {
                  setTimeout(async () => {
                    try {
                      formSetIsSubmitting(true);

                      const requestResult = await onSubmit(values, dispatchFormAction);
      
                      if (requestResult === FORM_ERROR) {
                        setError("Form submission failed");
                      } else {
                        formSetIsSubmitting(false);
                      }
                    } catch (error) {
                      setError(getWords().SOMETHING_WENT_WRONG);
                    }
                  });
                };
  
              performForm();
            };
  
          if (hasErrors) {
            if (typeof options.onSubmitError === "function") {
              options.onSubmitError(errors, dispatchFormAction);
            }
          } else {
            try {
              handleNoError();
            } catch (err) {
              setError(getWords().SOMETHING_WENT_WRONG);
            } 
          }
        };

      if (management.get("readyToSubmit")) {
        const 
          values = management.get("values"),
          errors = management.get("errors");

        formSubmitHandled();
        performSubmit(values, errors);
      }
    }, [management]);

    return api;
  };

export default useImmutableForm;