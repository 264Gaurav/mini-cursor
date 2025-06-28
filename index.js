import { GoogleGenAI } from "@google/genai";
import readlineSync from 'readline-sync';
import { exec } from "child_process";
import { promisify } from "util";
import os from 'os'
import dotenv from 'dotenv';
dotenv.config();

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
console.log("Google API Key:", GOOGLE_API_KEY);

const platform = os.platform();

const asyncExecute = promisify(exec);

const History = [];
const ai = new GoogleGenAI({ apiKey: GOOGLE_API_KEY });


//  Tool create karte hai, jo kisi bhi terminal/ shell command ko execute kar sakta hai

async function executeCommand({command}) {

    try{
    const {stdout, stderr} = await asyncExecute(command);

    if(stderr){
        return `Error: ${stderr}`
    }

    return `Success: ${stdout} || Task executed completely`

    }
    catch(error){

        return `Error: ${error}`
    }

}



const executeCommandDeclaration = {
    name: "executeCommand",
    description:"Execute a single terminal/shell command. A command can be to create a folder, file, write on a file, edit the file or delete the file",
    parameters:{
        type:'OBJECT',
        properties:{
            command:{
                type:'STRING',
                description: 'It will be a single terminal command. Ex: "mkdir calculator"'
            },
        },
        required: ['command']
    }

}


const availableTools = {
   executeCommand
}



async function runAgent(userProblem) {

    History.push({
        role:'user',
        parts:[{text:userProblem}]
    });


    while(true){

   const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: History,
    config: {
        systemInstruction: `You are an Website builder expert. You have to create the frontend of the website by analysing the user Input.
        You have access of tool, which can run or execute any shell or terminal command.

        Current user operation system is: ${platform}
        Give command to the user according to its operating system support.


        <-- What is your job -->
        1: Analyse the user query to see what type of website the want to build
        2: Give them command one by one , step by step
        3: Use available tool executeCommand

        // Now you can give them command in following below
        1: First create a folder, Ex: mkdir "calulator"
        2: Inside the folder, create index.html , Ex: touch "calculator/index.html"
        3: Then create style.css same as above
        4: Then create script.js
        5: Then write a code in html file

        You have to provide the terminal or shell command to user, they will directly execute it



        `,
    tools: [{
      functionDeclarations: [executeCommandDeclaration]
    }],
    },
   });


   if(response.functionCalls&&response.functionCalls.length>0){

    console.log(response.functionCalls[0]);
    const {name,args} = response.functionCalls[0];

    const funCall =  availableTools[name];
    const result = await funCall(args);

    const functionResponsePart = {
      name: name,
      response: {
        result: result,
      },
    };

    // model
    History.push({
      role: "model",
      parts: [
        {
          functionCall: response.functionCalls[0],
        },
      ],
    });

    // result Ko history daalna

    History.push({
      role: "user",
      parts: [
        {
          functionResponse: functionResponsePart,
        },
      ],
    });
   }
   else{

    History.push({
        role:'model',
        parts:[{text:response.text}]
    })
    console.log(response.text);
    break;
   }


  }




}


async function main() {

    console.log("I am a cursor: let's create a website");
    const userProblem = readlineSync.question("Ask me anything--> ");
    await runAgent(userProblem);
    main();
}


main();





