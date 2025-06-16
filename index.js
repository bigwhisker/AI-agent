import { ChatOpenAI } from '@langchain/openai'
import { APIKEY } from './env.js'
import express from 'express'
import cors from 'cors'
import { BufferMemory } from 'langchain/memory'
import { PromptTemplate } from '@langchain/core/prompts'
const app = express()
app.use(express.json())
app.use(cors())
const model = new ChatOpenAI({
    temperature: 1.3, // 温度
    modelName: 'deepseek-chat', // 模型名称
    openAIApiKey: APIKEY, // 你的APIKEY
    configuration: {
        baseURL: 'https://api.deepseek.com' // 模型地址
    }
})

//创建记忆能力
const memory = new BufferMemory({
    returnMessages: true, // 返回消息
    memoryKey: 'chat_history', // 记忆键
    inputKey: 'input', // 输入键 我们的问题
})

//创建提示词

const prompt = new PromptTemplate({
    template: `
       你是一个女仆，你的任务是回答用户的问题
       对话内容：
       {chat_history}
       用户的问题：
       {input}
       你的回答：
    `,
    inputVariables: ['input', 'chat_history']
})

app.post('/chat', async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.flushHeaders()
    const { message } = req.body
    const history = await memory.loadMemoryVariables({})
    const chatHistory = history.chat_history || []
    console.log(chatHistory)
    const formattedPrompt = await prompt.format({
        input: message,
        chat_history: chatHistory
    })
    const result = await model.stream(formattedPrompt)
    for await (const chunk of result) {
        res.write(chunk.content)
    }

    //保存历史对话 存到内存里面
    await memory.saveContext(
        { input: message, }, // 输入
        { output: formattedPrompt } // 输出
    )
})


app.listen(3000, () => {
    console.log('Server is running on port 3000')
})




