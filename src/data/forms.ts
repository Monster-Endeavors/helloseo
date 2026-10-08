/**
 * Form definitions (fields, labels, options) used by <Form>.
 * Field ids are kept stable so submissions stay comparable over time.
 */

export const contactForm = {
  "name": "Contact Form",
  "submitText": "Submit",
  "successRedirect": "/thank-you",
  "fields": [
    {
      "id": "name-8129cc78-54b6-4dcf-8075-122695e20b56",
      "required": true,
      "title": "Name",
      "type": "name"
    },
    {
      "id": "email-b68a64b5-708e-4151-a443-3ff26e738f9e",
      "required": true,
      "title": "Email",
      "type": "email"
    },
    {
      "id": "text-4b2a04dd-93a4-41c1-8e87-10daad81ee51",
      "required": true,
      "title": "Business Name",
      "type": "text"
    },
    {
      "required": true,
      "id": "website-399ad3e9-fc8b-4260-b19f-d7e5b7f7b45a",
      "type": "website",
      "title": "Website"
    },
    {
      "required": true,
      "id": "checkbox-8886449a-a492-43f9-87a3-8513c16f1565",
      "type": "checkbox",
      "options": [
        "Locally",
        "Nationally",
        "Globally"
      ],
      "title": "Where do you service customers?"
    },
    {
      "required": true,
      "id": "textarea-8f815d59-69b1-45a3-9cbe-25ffe4c956b8",
      "type": "textarea",
      "title": "What are your top marketing/SEO goals right now? What are your top challenges?"
    },
    {
      "required": true,
      "id": "textarea-fa17ad18-d259-48d3-97be-a6de882c71c2",
      "type": "textarea",
      "title": "Have you worked with an SEO agency before? If yes, what was your experience like?"
    },
    {
      "required": true,
      "id": "radio-309ec6a0-864a-466c-94bf-71520b57d0aa",
      "type": "radio",
      "options": [
        "Yes",
        "No"
      ],
      "title": "Do you currently have an in-house marketing team or freelancer?"
    },
    {
      "required": true,
      "id": "radio-51f34d94-1160-4cb9-bbe2-94779bd00d2a",
      "type": "radio",
      "options": [
        "$299 (I need a Power Hour!)",
        "$500 - $1k (I need SEO Foundations)",
        "$1k–$3k (I need the works!)",
        "$3k+ (I need a custom package)"
      ],
      "title": "What is your approximate monthly marketing budget?"
    },
    {
      "required": true,
      "id": "select-6e9ca8a0-e591-4b46-a632-1da3248c563c",
      "type": "select",
      "placeholder": "Select an option",
      "options": [
        "ASAP",
        " 1 - 3 months",
        " Just exploring",
        "Other"
      ],
      "title": "How soon are you looking to get started?",
      "followUpQuestions": [
        {
          "required": false,
          "id": "text-0d3b16bf-7a7d-47d1-a1d3-806867c14a7b",
          "type": "text",
          "title": "Share more",
          "condition": {}
        }
      ]
    },
    {
      "required": true,
      "id": "select-f65a76e5-3e0e-4f07-8c55-e1cc4999edbc",
      "type": "select",
      "placeholder": "Select an option",
      "options": [
        "LinkedIn",
        "Google Search",
        "Other"
      ],
      "title": "How did you find us?"
    }
  ]
};

export const reportCardForm = {
  "name": "SEO Report Card Form",
  "submitText": "Get My Report Card",
  "submissionHtml": "<p>Thank you!</p>",
  "design": {
    "buttonAlignment": "stretch"
  },
  "fields": [
    {
      "id": "name-c2c21aaa-fd5b-446d-9ace-577390d3e76b",
      "required": true,
      "title": "Name",
      "type": "name"
    },
    {
      "id": "email-cb0d147b-dafb-4c76-ba24-d8f411389a7c",
      "required": true,
      "title": "Email",
      "type": "email"
    },
    {
      "required": false,
      "id": "website-645a20b2-c130-4530-b530-1811a5ebfd67",
      "type": "website",
      "title": "Website"
    },
    {
      "id": "textarea-36112576-c619-46b7-ba48-bd8415a175a9",
      "required": true,
      "title": "What is your Biggest SEO Question",
      "type": "textarea"
    }
  ]
};
