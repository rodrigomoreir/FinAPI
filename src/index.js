const express = require('express')
const { v4: uuidv4 } = require("uuid")

const app = express()

// é um middleware
app.use(express.json())

const customers = []

// Middleware
function verifyIfExistsAccountCPG(request, response, next) {
    // O terceiro parametro, o next, é quem define se o middleware continuar a operação ou para por ali
    const { cpf } = request.headers

    // find() retorna o objeto/dados achados
    const customer = customers.find(customer => customer.cpf === cpf)

    if (!customer) {
        return response.status(400).json({ error: "Customer not found" })
    }

    // Notação para passar um dado do middleware a seguir
    request.customer = customer

    return next()
}

function getBalance(statement) {
    // reduce() transforma todos os valores passados para ele em um unico valor
    // ela recebe dois parametros, um acumulador e o objeto que queremos
    const balance = statement.reduce((acc, operation) => {
        if (operation.type === 'credit') {
            return acc + operation.amount
        } else {
            return acc - operation.amount
        }
    }, 0)
    // o zero é o valor inicial do reduce

    return balance
}

app.post("/account", (request, response) => {
    const { cpf, name } = request.body

    // some() retorna verdadeiro ou falso de acordo com a busca dele
    const customerAlreadyExists = customers.some((customer) => customer.cpf === cpf)

    if (customerAlreadyExists) {
        return response.status(400).json({ error: "Customer already exists!" })
    }

    //inserindo dados dentro do array
    customers.push({
        cpf,
        name,
        id: uuidv4(),
        statement: []
    })

    return response.status(201).send()
})

// Uma das formas de se usar o middleware, nesse caso, utiliza-se assim quando 
// quero que todas as rotas a seguir utilizem esse middleware, mas se for em apenas
// uma rota, usa-se como parametro entre a rota e o requestResponse.
// app.use(verifyIfExistsAccountCPG)

app.get("/statement", verifyIfExistsAccountCPG, (request, response) => {
    // recuperando o dado passado no middleware
    const { customer } = request

    return response.json(customer.statement)
})

app.post("/deposit", verifyIfExistsAccountCPG, (request, response) => {
    const { description, amount } = request.body

    const { customer } = request

    const statementOperation = {
        description,
        amount,
        created_at: new Date(),
        type: "credit"
    }

    customer.statement.push(statementOperation)

    return response.status(201).send()
})

app.post("/withdraw", verifyIfExistsAccountCPG, (request, response) => {
    const { amount } = request.body
    const { customer } = request

    const balance = getBalance(customer.statement)

    if (balance < amount) {
        return response.status(400).json({ error: "Insufficient funds!" })
    }

    const statementOperation = {
        amount,
        created_at: new Date(),
        type: "debit"
    }

    customer.statement.push(statementOperation)

    return response.status(201).send()
})

app.get("/statement/date", verifyIfExistsAccountCPG, (request, response) => {
    // recuperando o dado passado no middleware
    const { customer } = request
    const { date } = request.query

    const dateFormat = new Date(date + " 00:00")

    const statement = customer.statement.filter((statement) => statement.created_at.toDateString() === new Date(dateFormat).toDateString())

    return response.json(statement)
})

app.put("/account", verifyIfExistsAccountCPG, (request, response) => {
    const { name } = request.body
    const { customer } = request

    customer.name = name

    return response.status(201).send()
})

app.get("/account", verifyIfExistsAccountCPG, (request, response) => {
    const { customer } = request

    return response.json(customer)
})

app.delete("/account", verifyIfExistsAccountCPG, (request, response) => {
    const { customer } = request

    // splice é uma das formas de remover algo de um array, splice recebe 2 parametros
    // o primeiro é onde começa, e o segundo é até onde deve remover, nesse caso so ele, então 1
    customers.splice(customer, 1)

    return response.status(200).json(customers)
})

app.get("/balance", verifyIfExistsAccountCPG, (request, response) => {
    const { customer } = request

    const balance = getBalance(customer.statement)

    return response.json(balance)
})

// starta a aplicação
app.listen(3333) 