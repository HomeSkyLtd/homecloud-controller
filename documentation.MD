<a name="Homecloud"></a>

## Homecloud
**Kind**: global class  

* [Homecloud](#Homecloud)
    * [new Homecloud(options)](#new_Homecloud_new)
    * _instance_
        * [.newNodes(nodes, [onSend], [onError])](#Homecloud+newNodes)
        * [.newData(dataArray, [onSend], [onError])](#Homecloud+newData)
        * [.newCommand(dataArray, [onSend], [onError])](#Homecloud+newCommand)
        * [.setNodeState(nodeId, alive, [onSend], [onError])](#Homecloud+setNodeState)
        * [.actionResult(action, result, [onSend], [onError])](#Homecloud+actionResult)
        * [.getRules([onSend], [onError])](#Homecloud+getRules)
        * [.onAction(callback)](#Homecloud+onAction)
        * [.onRules(callback)](#Homecloud+onRules)
        * [.onAcceptNode(callback)](#Homecloud+onAcceptNode)
        * [.onRemoveNode(callback)](#Homecloud+onRemoveNode)
    * _inner_
        * [~onSend](#Homecloud..onSend) : <code>function</code>
        * [~onNotification](#Homecloud..onNotification) : <code>function</code>

<a name="new_Homecloud_new"></a>

### new Homecloud(options)

| Param | Type | Description |
| --- | --- | --- |
| options | <code>Object</code> | Server and controller configurations |

<a name="Homecloud+newNodes"></a>

### homecloud.newNodes(nodes, [onSend], [onError])
Notificates server of new detected nodes

**Kind**: instance method of <code>[Homecloud](#Homecloud)</code>  

| Param | Type | Description |
| --- | --- | --- |
| nodes | <code>Array.&lt;Homecloud~Node&gt;</code> | List containing new detected nodes |
| [onSend] | <code>Homecloud~OnSend</code> | Callback to call when the message was sent |
| [onError] | <code>Homecloud~OnError</code> | Callback to call when the server rejected the message |

<a name="Homecloud+newData"></a>

### homecloud.newData(dataArray, [onSend], [onError])
Notificates server of new sensor data

**Kind**: instance method of <code>[Homecloud](#Homecloud)</code>  

| Param | Type | Description |
| --- | --- | --- |
| dataArray | <code>Array.&lt;Homecloud~Data&gt;</code> | List containing new sensor data |
| [onSend] | <code>Homecloud~OnSend</code> | Callback to call when the message was sent |
| [onError] | <code>Homecloud~OnError</code> | Callback to call when the server rejected the message |

<a name="Homecloud+newCommand"></a>

### homecloud.newCommand(dataArray, [onSend], [onError])
Notificates server of new actuator change (external command or by rules)

**Kind**: instance method of <code>[Homecloud](#Homecloud)</code>  

| Param | Type | Description |
| --- | --- | --- |
| dataArray | <code>Array.&lt;Homecloud~Data&gt;</code> | List containing executed commands |
| [onSend] | <code>Homecloud~OnSend</code> | Callback to call when the message was sent |
| [onError] | <code>Homecloud~OnError</code> | Callback to call when the server rejected the message |

<a name="Homecloud+setNodeState"></a>

### homecloud.setNodeState(nodeId, alive, [onSend], [onError])
Notificates server of state change in the node

**Kind**: instance method of <code>[Homecloud](#Homecloud)</code>  

| Param | Type | Description |
| --- | --- | --- |
| nodeId | <code>number</code> | Id of the node |
| alive | <code>boolean</code> | Indicates if the node is alive (true) or dead (false) |
| [onSend] | <code>Homecloud~OnSend</code> | Callback to call when the message was sent |
| [onError] | <code>Homecloud~OnError</code> | Callback to call when the server rejected the message |

<a name="Homecloud+actionResult"></a>

### homecloud.actionResult(action, result, [onSend], [onError])
Notificates server of the result of an action he asked

**Kind**: instance method of <code>[Homecloud](#Homecloud)</code>  

| Param | Type | Description |
| --- | --- | --- |
| action | <code>Homecloud~Action</code> | The action executed (or not) |
| result | <code>boolean</code> | Indicates if the action was executed (true) or not (false) |
| [onSend] | <code>Homecloud~OnSend</code> | Callback to call when the message was sent |
| [onError] | <code>Homecloud~OnError</code> | Callback to call when the server rejected the message |

<a name="Homecloud+getRules"></a>

### homecloud.getRules([onSend], [onError])
Gets all the accepted rules in the server

**Kind**: instance method of <code>[Homecloud](#Homecloud)</code>  

| Param | Type | Description |
| --- | --- | --- |
| [onSend] | <code>Homecloud~OnSend</code> | Callback to call when the message was sent, containing the rules |
| [onError] | <code>Homecloud~OnError</code> | Callback to call when the server rejected the message |

<a name="Homecloud+onAction"></a>

### homecloud.onAction(callback)
Defines the function to call when there is an action

**Kind**: instance method of <code>[Homecloud](#Homecloud)</code>  

| Param | Type | Description |
| --- | --- | --- |
| callback | <code>Homecloud~OnNotification</code> | Callback to call when server send new action |

<a name="Homecloud+onRules"></a>

### homecloud.onRules(callback)
Defines the function to call when there is change in rules

**Kind**: instance method of <code>[Homecloud](#Homecloud)</code>  

| Param | Type | Description |
| --- | --- | --- |
| callback | <code>Homecloud~OnNotification</code> | Callback to call when there is change in rules |

<a name="Homecloud+onAcceptNode"></a>

### homecloud.onAcceptNode(callback)
Defines the function to call when user accepted (or not) a discovered node

**Kind**: instance method of <code>[Homecloud](#Homecloud)</code>  

| Param | Type | Description |
| --- | --- | --- |
| callback | <code>Homecloud~OnNotification</code> | Callback to call when a node is accepted (or not) |

<a name="Homecloud+onRemoveNode"></a>

### homecloud.onRemoveNode(callback)
Defines the function to call when a node is removed by the user

**Kind**: instance method of <code>[Homecloud](#Homecloud)</code>  

| Param | Type | Description |
| --- | --- | --- |
| callback | <code>Homecloud~OnNotification</code> | Callback to call when a node is removed |

<a name="Homecloud..onSend"></a>

### Homecloud~onSend : <code>function</code>
Callback used by messages to the server

**Kind**: inner typedef of <code>[Homecloud](#Homecloud)</code>  

| Param | Type | Description |
| --- | --- | --- |
| data | <code>Object</code> | Json object containing the response from server. It contains at least a status property |

<a name="Homecloud..onNotification"></a>

### Homecloud~onNotification : <code>function</code>
Callback used by notifications from the server

**Kind**: inner typedef of <code>[Homecloud](#Homecloud)</code>  

| Param | Type | Description |
| --- | --- | --- |
| data | <code>Object</code> | Json object containing the notification. |

