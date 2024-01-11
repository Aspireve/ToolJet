const {
  type,
  number,
  string,
  array,
  any,
  optional,
  boolean,
  union,
  size,
  pattern,
  defaulted,
  coerce,
  create,
  literal,
} = require('superstruct');

import _ from 'lodash';

const generateSchemaFromValidationDefinition = (definition, recursionDepth = 0) => {
  let schema;

  switch (definition?.type ?? '') {
    case 'string': {
      schema = string();
      if (definition?.pattern) schema = pattern(schema, RegExp(definition.pattern, 'i'));

      if (recursionDepth === 0) {
        schema = coerce(schema, number(), JSON.stringify);
        schema = defaulted(schema, () => '', { strict: true });
      }

      break;
    }
    case 'number': {
      schema = number();

      if (recursionDepth === 0) {
        schema = coerce(schema, string(), (value) => {
          const parsedValue = parseFloat(value);
          const finalValue = parsedValue ? parsedValue : value;
          return finalValue;
        });
        schema = defaulted(schema, () => 0, { strict: true });
      }
      break;
    }
    case 'boolean': {
      schema = boolean();
      break;
    }
    case 'union': {
      schema = union(
        definition.schemas?.map((subSchema) => generateSchemaFromValidationDefinition(subSchema, recursionDepth))
      );
      break;
    }
    case 'array': {
      const elementSchema = generateSchemaFromValidationDefinition(definition.element ?? {}, recursionDepth + 1);
      schema = array(elementSchema);

      if (recursionDepth === 0) {
        schema = coerce(schema, literal(undefined), (value) => {
          console.log({ shashi: value, recursionDepth });
          return [];
        });
      }

      break;
    }
    case 'object': {
      const obJectSchema = Object.fromEntries(
        Object.entries(definition.object ?? {}).map(([key, value]) => {
          const generatedSchema = generateSchemaFromValidationDefinition(value, recursionDepth + 1);
          return [key, generatedSchema];
        })
      );
      schema = type(obJectSchema);

      if (recursionDepth === 0) {
        schema = defaulted(schema, () => ({}), { strict: true });
      }

      break;
    }
    default:
      schema = any();
  }

  if (definition?.size) {
    const minSize = definition.size?.min ?? 0;
    const maxSize = definition.size?.max ?? Infinity;
    schema = size(schema, minSize, maxSize);
  }

  return definition.optional ? optional(schema) : schema;
};

const validate = (value, schema, _defaultValue) => {
  let valid = true;
  const errors = [];
  let newValue = undefined;

  try {
    newValue = create(value, schema);
  } catch (structError) {
    valid = false;
    errors.push(structError.message);
    console.log({ structError });
  }

  return [valid, errors, newValue];
};

export const validateProperties = (resolvedProperties, propertyDefinitions) => {
  let allErrors = [];
  const coercedProperties = Object.fromEntries(
    Object.entries(resolvedProperties ?? {}).map(([propertyName, value]) => {
      const validationDefinition = propertyDefinitions[propertyName]?.validation?.schema;
      const defaultValue = validationDefinition ? findDefault(validationDefinition, value) : undefined;

      const schema = _.isUndefined(validationDefinition)
        ? any()
        : generateSchemaFromValidationDefinition(validationDefinition);

      const [_valid, errors, newValue] = propertyName ? validate(value, schema, defaultValue) : [true, []];

      if (!_.isUndefined(propertyName)) {
        allErrors = [
          ...allErrors,
          ...errors.map((message) => ({
            property: propertyDefinitions[propertyName]?.displayName,
            message,
          })),
        ];
      }

      return [propertyName, _valid ? newValue : defaultValue];
      // comment the above line and uncomment the below line to disable coercing to default values
      // return [propertyName, value];
    })
  );
  return [coercedProperties, allErrors];
};

export const validateProperty = (resolvedProperty, propertyDefinitions, paramName) => {
  const validationDefinition = propertyDefinitions?.validation?.schema;
  const value = resolvedProperty?.[paramName];
  const defaultValue = propertyDefinitions?.validation?.defaultValue;

  const schema = _.isUndefined(validationDefinition)
    ? any()
    : generateSchemaFromValidationDefinition(validationDefinition);
  const [_valid, errors, newValue] = paramName ? validate(value, schema, defaultValue) : [true, []];
  return [_valid, errors, newValue];
};

function findDefault(definition, value) {
  switch (definition.type) {
    case 'string':
      return '';
    case 'number':
      return 0;
    case 'boolean':
      return value;
    case 'array':
      return [];
    case 'object':
      return {};
    case 'union':
      return findDefault(definition.schemas[0], value);
    default:
      return undefined;
  }
}
