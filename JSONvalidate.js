const { Schema, validate } = require("jtd");

// You can leave out the "as Schema" part at the end if you're using JavaScript
// and not TypeScript.
const schema = {
  "properties": {
    "id": { "type": "string" },
    "title": { "type": "string" },
    "type" : { "type" : "string", "enum" : ["doc"] },
    "content": {
      "elements": {
        "discriminator": "type",
        "mapping": {
          "paragraph": { 
              "properties": {
                "content": {
                  "ref": "contentBlock"
                }
              }
          },
          "heading": {
            "properties": {
              "level": { "type": "uint8" },
              "content": {
                "ref" : "contentBlock"
              }
            }
          },
          "bullet_list": { 
              "properties": {
                "content": {
                  "ref": "contentBlock"
                }
              }
            },
          "hard_break": {},
          "image": {
            "properties": {
              "src": { "type": "string" },
              "alt": { "optional": "true", "type": "string" },
              "title": { "optional": "true", "type": "string" }
            }
          }
        }
      }
    },
    "collaborators": {
      "elements": {
        "properties": {
          "id": { "type": "string" },
          "name": { "type": "string" },
          "color": { "type": "string" },
          "position": { "type": "int32" }
        }
      }
    }
  },
  "definitions": {
    "contentBlock": {
      "elements": {
        "discriminator": "type",
        "mapping": {
          "text": {
            "properties": {
              "text": { "type": "string" },  
            },
            "optionalProperties": {
              "marks": {
                "optionalProperties": {
                  "bold": { "type": "boolean" },
                  "italic": { "type": "boolean" },
                  "underline": { "type": "boolean" },
                  "link": {
                    "optional": "true",
                    "properties": {
                      "href": { "type": "string" }
                    }
                  }
                }
              }
            }
          },
          "list_item": { 
            "properties": {
              "content": {
                "ref": "contentBlock"
              }
            }
          },
        }
      }
    }
  }
  
};

// jtd.validate returns an array of validation errors. If there were no problems
// with the input, it returns an empty array.

// Outputs: []
console.log(JSON.stringify(validate(schema, {
    "type" : "doc",
    "id": "doc1",
    "title": "Collaborative Document",
    "content": [
      {
        "type": "heading",
        "level": 1,
        "content": [
          {
            "type": "text",
            "text": "Introduction",
            "marks": { "bold": true }
          }
        ]
      },
      {
        "type": "paragraph",
        "content": [
          {
            "type": "text",
            "text": "This is an example of a "
          },
          {
            "type": "text",
            "text": "collaborative document",
            "marks": { "bold": true, "italic": true }
          },
          {
            "type": "text",
            "text": ". Pretty cool and stuff."
          }
        ]
      },
      {
        "type": "bullet_list",
        "content": [
          {
            "type": "list_item",
            "content": [
              {
                "type": "text",
                "text": "First item"
              }
            ]
          },
          {
            "type": "list_item",
            "content": [
              {
                "type": "text",
                "text": "Second item"
              }
            ]
          }
        ]
      },
      {
        "type": "hard_break"
      },
      {
        "type": "image",
        "src": "https://example.com/image.jpg",
        "alt": "Example Image",
        "title": "Example Image Title"
      }
    ],
    "collaborators": [
      {
        "id": "collab1",
        "name": "John Doe",
        "color": "#ff0000",
        "position": 3
      },
      {
        "id": "collab2",
        "name": "Bob Smith",
        "color": "#ff0001",
        "position": 1
      }
    ]
})))

// console.log("\n")

// console.log(JSON.stringify(validate(schema, {
//   "type" : "doc",
//   "id": "doc1",
//   "title": "Collaborative Document",
//   "content": [
//     {
//       "type": "paragraph",
//       "content": [
//         {
//           "type": "text",
//           "text": "Scooby Doo",
//           "marks": {
//             "bold": true
//           }
//         }
//       ]
//     },
//     {
//       "type": "list_item",
//       "content": [
//         {
//           "type": "text",
//           "text": "Scooby Doo",
//           "marks": {
//             "bold": true
//           }
//         }
//       ]
//     },
//   ],
//   "collaborators": [
//     {
//       "id": "collab1",
//       "name": "John Doe",
//       "color": "#ff0000",
//       "position": 3
//     },
//     {
//       "id": "collab2",
//       "name": "Bob Smith",
//       "color": "#ff0001",
//       "position": 1
//     }
//   ]
// })))

// This next input has three problems with it:
//
// 1. It's missing "name", which is a required property.
// 2. "age" is a string, but it should be an integer.
// 3. "phones[1]" is a number, but it should be a string.
//
// Each of those errors corresponds to one of the errors returned by validate.

// Outputs:
//
// [
//   { instancePath: [], schemaPath: [ 'properties', 'name' ] },
//   {
//     instancePath: [ 'age' ],
//     schemaPath: [ 'properties', 'age', 'type' ]
//   },
//   {
//     instancePath: [ 'phones', '1' ],
//     schemaPath: [ 'properties', 'phones', 'elements', 'type' ]
//   }
// ]
// console.log(JSON.stringify(validate(schema, {
//   "userLoc": { "lat": 50, "lng": -90 }, 
//   "serverLoc": { "lat": -15, "lng": 50 }
// })))