# leon-mssql

MSSQL数据库的MCP服务器，支持执行SQL查询和存储过程。

## 快速开始

### 1. 安装依赖（仅首次需要）

```bash
npm install
```

### 2. 编译项目（仅首次需要）

```bash
npm run build
```

### 3. 配置MCP客户端

在你的MCP客户端配置文件中添加以下配置：

#### 方式一：使用连接字符串（推荐）

```json
{
  "mcpServers": {
    "leon-mssql": {
      "command": "node",
      "args": ["E:/my-mcp-servers/leon-mssql/dist/index.js"],
      "env": {
        "MSSQL_CONNECTION_STRING": "Server=192.168.1.100;Database=MyDatabase;User Id=sa;Password=your_password;Encrypt=true;TrustServerCertificate=true;"
      }
    }
  }
}
```

#### 方式二：使用单独参数

```json
{
  "mcpServers": {
    "leon-mssql": {
      "command": "node",
      "args": ["E:/my-mcp-servers/leon-mssql/dist/index.js"],
      "env": {
        "MSSQL_SERVER": "192.168.1.100",
        "MSSQL_DATABASE": "MyDatabase",
        "MSSQL_USER": "sa",
        "MSSQL_PASSWORD": "your_password",
        "MSSQL_PORT": "1433",
        "MSSQL_ENCRYPT": "true",
        "MSSQL_TRUST_SERVER_CERTIFICATE": "true"
      }
    }
  }
}
```

**注意：** 请将路径和连接信息替换为你自己的实际值。

## 可用功能

连接数据库后，你可以使用以下工具：

- `configure_connection` - 配置数据库连接（如果未在环境变量中配置）
- `execute_query` - 执行SQL查询
- `execute_stored_procedure` - 执行存储过程
- `get_tables` - 获取数据库表列表
- `get_table_schema` - 获取表结构信息
- `disconnect` - 断开数据库连接

## 连接字符串格式

完整的连接字符串格式如下：

```
Server=服务器地址;Database=数据库名;User Id=用户名;Password=密码;Encrypt=true;TrustServerCertificate=true;
```

常用参数：
- `Server` - 数据库服务器地址或IP
- `Database` - 数据库名称
- `User Id` - 用户名
- `Password` - 密码
- `Encrypt` - 是否加密（通常为true）
- `TrustServerCertificate` - 是否信任服务器证书（开发环境通常为true）
- `Port` - 端口号（默认1433）

## 开发说明

如果你需要修改代码并重新编译：

```bash
npm run build
```

如果需要开发模式（自动重新编译）：

```bash
npm run dev
```
